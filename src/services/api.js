// API服务层
import Taro from '@tarojs/taro';

// API基础配置
const API_BASE_URL = 'http://localhost:5050'; // 后端服务地址

// 通用请求函数
async function request(url, options = {}) {
  try {
    // 构建完整的请求URL
    const fullUrl = `${API_BASE_URL}${url}`;
    
    // 设置默认请求头
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // 添加认证token（如果有）
    const token = Taro.getStorageSync('token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    // 发送请求
    const response = await Taro.request({
      url: fullUrl,
      method: options.method || 'GET',
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      data: options.body ? JSON.parse(options.body) : undefined,
    });
    
    // 检查响应状态
    if (response.statusCode === 200) {
      return response.data;
    } else {
      throw new Error(response.data.message || '请求失败');
    }
  } catch (error) {
    console.error('API请求错误:', error);
    // 直接抛出错误，不使用模拟数据
    throw error;
  }
}

// 位置相关API
export const locationApi = {
  // 获取城市列表
  getCities: async () => {
    return request('/mobile/city/list');
  },

  // 根据坐标获取位置信息
  getLocationByCoords: async (latitude, longitude) => {
    return request(`/mobile/location?lat=${latitude}&lng=${longitude}`);
  }
};

// 用户相关API
export const userApi = {
  // 登录
  login: async (credentials) => {
    return request('/mobile/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  // 注册
  register: async (userData) => {
    return request('/mobile/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // 获取验证码
  getVerificationCode: async (phone) => {
    return request('/mobile/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  // 获取用户信息
  getUserInfo: async () => {
    return request('/mobile/user/profile');
  },

  // 更新用户信息
  updateUserInfo: async (userData) => {
    return request('/mobile/user/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }
};

// 酒店相关API
export const hotelApi = {
  // 搜索酒店
  searchHotels: async (params) => {
    // 构建查询字符串
    const queryString = new URLSearchParams(params).toString();
    return request(`/mobile/hotel/search?${queryString}`);
  },

  // 获取酒店详情
  getHotelDetail: async (hotelId) => {
    return request(`/mobile/hotel/${hotelId}/detail`);
  },

  // 获取酒店评论
  getHotelReviews: async (hotelId, params) => {
    const queryString = new URLSearchParams(params).toString();
    return request(`/mobile/hotel/${hotelId}/reviews?${queryString}`);
  }
};

// 订单相关API
export const orderApi = {
  // 获取订单列表
  getOrders: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    return request(`/mobile/booking?${queryString}`);
  },

  // 获取订单详情
  getOrderDetail: async (orderId) => {
    return request(`/mobile/booking/${orderId}`);
  },

  // 创建订单
  createOrder: async (orderData) => {
    return request('/mobile/booking', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  // 取消订单
  cancelOrder: async (orderId) => {
    return request(`/mobile/booking/${orderId}/cancel`, {
      method: 'POST',
    });
  },

  // 支付订单
  payOrder: async (orderId, paymentData) => {
    return request(`/mobile/payment/${orderId}`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }
};

// 收藏相关API
export const favoriteApi = {
  // 获取收藏列表
  getFavorites: async () => {
    return request('/mobile/favorite');
  },

  // 添加收藏
  addFavorite: async (hotelId) => {
    return request(`/mobile/hotel/${hotelId}/favorite`, {
      method: 'POST',
    });
  },

  // 删除收藏
  removeFavorite: async (hotelId) => {
    return request(`/mobile/hotel/${hotelId}/favorite`, {
      method: 'POST',
    });
  }
};

// 历史记录相关API
export const historyApi = {
  // 获取浏览历史
  getHistory: async () => {
    return request('/mobile/history');
  },

  // 删除历史记录
  removeHistory: async (historyId) => {
    return request(`/mobile/history/${historyId}`, {
      method: 'DELETE',
    });
  },

  // 清空历史记录
  clearHistory: async () => {
    return request('/mobile/history', {
      method: 'DELETE',
    });
  }
};

// 优惠券相关API
export const couponApi = {
  // 获取优惠券列表
  getCoupons: async () => {
    return request('/mobile/promotion/coupons');
  },

  // 使用优惠券
  useCoupon: async (couponId, orderId) => {
    return request(`/mobile/promotion/coupon/${couponId}/use`, {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId }),
    });
  }
};

// 首页相关API
export const homeApi = {
  // 获取首页数据
  getHomeData: async () => {
    return request('/mobile/home');
  },

  // 获取轮播图
  getBanners: async () => {
    return request('/mobile/banner');
  }
};
