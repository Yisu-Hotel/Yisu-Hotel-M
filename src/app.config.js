// src/app.config.js
export default {
  pages: ["pages/hotel-detail/index",  // 房型详情页
    "pages/booking-confirm/index" ,// 预订确认页
    "pages/index/index"         // 团队首页（保留）
    
    
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#fff",
    navigationBarTitleText: "酒店预订",
    navigationBarTextStyle: "black"
  },
  // 路由模式（团队项目建议用 hash，兼容性更好）
  router: {
    mode: "hash"
  }
};