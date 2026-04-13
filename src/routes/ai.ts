import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { queryOne } from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { GoogleGenAI } from '@google/genai';

const router = Router();
const UPLOADS_DIR = './uploads';

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Helper: get setting from DB
async function getSetting(key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>('SELECT value FROM settings WHERE key = $1', [key]);
  return row?.value || null;
}

// POST /api/ai/analyze
router.post('/analyze', authenticate, upload.single('image'), async (req: AuthRequest, res) => {
  const { text } = req.body;
  const imageFile = req.file;

  const [dbModelType, dbApiKey, dbEndpoint, dbModelName] = await Promise.all([
    getSetting('ai_model_type'),
    getSetting('ai_api_key'),
    getSetting('ai_endpoint'),
    getSetting('ai_model_name')
  ]);

  const modelType = dbModelType || process.env.MODEL_TYPE || 'gemini';
  const apiKey = dbApiKey || process.env.AI_API_KEY;
  const endpointBase = dbEndpoint || process.env.AI_ENDPOINT;
  const modelName = dbModelName || process.env.AI_MODEL_NAME;

  const prompt = `请根据用户输入的物品名称、动作或图像，做标准化处理并给出意图识别。
规则：
1. 只返回标准 JSON，不要任何多余解释、 markdown、注释、对话。
2. itemName 为物品标准名称，简洁准确。
3. suggestLocation 从以下位置选择一个：客厅、餐厅、厨房、主卧、次卧、书房、储物间、地下室。
4. action 为识别出的意图：取出(take) 或 放回(store)。
   - 如果用户提到"拿走"、"取出"、"用了"、"吃掉"等，识别为 take。
   - 如果用户提到"放回"、"存入"、"买了"、"收好"等，或者没有明确动作，识别为 store。
5. 不要添加额外字段，严格按格式返回。
返回格式： { "itemName": "标准物品名", "suggestLocation": "建议存放位置", "action": "take" | "store" }
${text ? `用户输入：${text}` : '请识别图像中的主要物品并给出建议存放位置（默认为放回意图）。'}`;

  try {
    if (modelType === 'gemini') {
      if (!apiKey) throw new Error('AI_API_KEY not set. Please configure AI settings in Admin panel.');

      const ai = new GoogleGenAI({ apiKey });
      const parts: any[] = [{ text: prompt }];

      if (imageFile) {
        parts.push({
          inlineData: {
            data: fs.readFileSync(imageFile.path).toString("base64"),
            mimeType: imageFile.mimetype
          }
        });
      }

      const response = await ai.models.generateContent({
        model: modelName || "gemini-1.5-flash",
        contents: [{ role: 'user', parts }]
      });

      let resultText = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}';
      res.json(JSON.parse(resultText));
    } else {
      // OpenAI-compatible APIs (doubao, qwen, ernie, minimax, gemma)
      let endpoint = '';
      if (modelType === 'doubao') endpoint = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
      else if (modelType === 'qwen') endpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
      else if (modelType === 'ernie') endpoint = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions';
      else if (modelType === 'minimax') endpoint = 'https://api.minimax.chat/v1/text/chatcompletion_v2';
      else if (modelType === 'gemma') endpoint = endpointBase || 'https://api.groq.com/openai/v1/chat/completions';
      else if (endpointBase) endpoint = endpointBase;

      if (!endpoint) throw new Error('Unsupported or unconfigured model type');

      const messages: any[] = [{ role: "user", content: prompt }];
      if (imageFile) {
        messages[0].content = [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${imageFile.mimetype};base64,${fs.readFileSync(imageFile.path).toString("base64")}` } }
        ];
      }

      const aiRes = await axios.post(endpoint, {
        model: modelName || (modelType === 'minimax' ? "MiniMax-VL-01" : "gpt-4-vision-preview"),
        messages,
        response_format: { type: "json_object" }
      }, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      let content = aiRes.data.choices?.[0]?.message?.content || '{}';
      res.json(JSON.parse(content));
    }
  } catch (err: any) {
    console.error('AI Error:', err);
    res.status(500).json({ error: 'AI analysis failed: ' + err.message });
  } finally {
    if (imageFile && fs.existsSync(imageFile.path)) fs.unlinkSync(imageFile.path);
  }
});

export default router;
