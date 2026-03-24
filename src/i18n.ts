import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "Home": "Home",
      "Cabinet": "Cabinet",
      "Items": "Items",
      "History": "History",
      "Search": "Search",
      "Settings": "Settings",
      "Login": "Login",
      "Register": "Register",
      "Logout": "Logout",
      "Email": "Email",
      "Password": "Password",
      "Security Question": "Security Question",
      "Security Answer": "Security Answer",
      "Recover Password": "Recover Password",
      "New Password": "New Password",
      "Create Cabinet": "Create Cabinet",
      "Cabinet Name": "Cabinet Name",
      "Type": "Type",
      "Direct Storage": "Direct Storage",
      "Nested Group": "Nested Group",
      "Create": "Create",
      "Create Small Cabinet": "Create Small Cabinet",
      "Small Cabinet": "Small Cabinet",
      "New Item": "New Item",
      "Item Name": "Item Name",
      "Details": "Details",
      "Quantity": "Quantity",
      "Store": "Store",
      "Take": "Take",
      "Erase My Data": "Erase My Data",
      "Admin Dashboard": "Admin Dashboard",
      "Reset Password": "Reset Password",
      "User List": "User List",
      "Success": "Success",
      "Error": "Error",
      "Math Challenge": "Please solve: {{problem}}",
      "Answer": "Answer",
      "Submit": "Submit",
      "Cancel": "Cancel",
      "Edit Name": "Edit Name",
      "No items found": "No items found",
      "Recent Actions": "Recent Actions",
      "Edit Item": "Edit Item",
      "Save": "Save",
      "Back": "Back",
      "Are you sure?": "Are you sure?",
      "Photo": "Photo",
      "No details": "No details",
      "Scan to view cabinet contents": "Scan to view cabinet contents",
      "Close": "Close"
    }
  },
  zh: {
    translation: {
      "Home": "主页",
      "Cabinet": "收纳柜",
      "Items": "物品",
      "History": "历史记录",
      "Search": "搜索",
      "Settings": "设置",
      "Login": "登录",
      "Register": "注册",
      "Logout": "退出登录",
      "Email": "邮箱",
      "Password": "密码",
      "Security Question": "安全问题",
      "Security Answer": "安全答案",
      "Recover Password": "找回密码",
      "New Password": "新密码",
      "Create Cabinet": "创建收纳柜",
      "Cabinet Name": "收纳柜名称",
      "Type": "类型",
      "Direct Storage": "直接存储",
      "Nested Group": "嵌套分组",
      "Create": "创建",
      "Create Small Cabinet": "创建小柜子",
      "Small Cabinet": "小柜子",
      "New Item": "新物品",
      "Item Name": "物品名称",
      "Details": "详情",
      "Quantity": "数量",
      "Store": "存入",
      "Take": "取出",
      "Erase My Data": "抹除我的数据",
      "Admin Dashboard": "管理后台",
      "Reset Password": "重置密码",
      "User List": "用户列表",
      "Success": "成功",
      "Error": "错误",
      "Math Challenge": "请计算: {{problem}}",
      "Answer": "答案",
      "Submit": "提交",
      "Cancel": "取消",
      "Edit Name": "修改名称",
      "No items found": "未找到物品",
      "Recent Actions": "最近操作",
      "Edit Item": "编辑物品",
      "Save": "保存",
      "Back": "返回",
      "Are you sure?": "确定吗？",
      "Photo": "照片",
      "No details": "暂无详情",
      "Scan to view cabinet contents": "扫码查看柜子内容",
      "Close": "关闭"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
