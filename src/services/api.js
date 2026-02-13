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
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });
    
    // 解析响应
    const data = await response.json();
    
    // 检查响应状态
    if (!response.ok) {
      throw new Error(data.msg || '请求失败');
    }
    
    return data;
  } catch (error) {
    console.error('API请求错误:', error);
    throw error;
  }
}

// 模拟数据
function getMockData(url, options) {
  // 酒店搜索模拟数据
  if (url.includes('/hotels/search')) {
    // 解析请求体，获取排序信息
    let sortType = 'default';
    if (options && options.body) {
      try {
        const params = JSON.parse(options.body);
        sortType = params.sort || 'default';
      } catch (error) {
        console.error('解析请求体失败:', error);
      }
    }
    
    // 模拟酒店数据
    const hotels = [
      {
        id: 1,
        name: '北京王府井希尔顿酒店',
        address: '北京市东城区王府井东街8号',
        price: 1280,
        rating: 4.8,
        image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=luxury%20hotel%20exterior%20modern%20building&image_size=landscape_4_3',
        amenities: ['免费WiFi', '停车场', '健身房', '游泳池', '餐厅'],
        distance: '0.5km',
        available: true,
        freeCancellation: true,
        collectionCount: 128
      },
      {
        id: 2,
        name: '北京国贸大酒店',
        address: '北京市朝阳区建国门外大街1号',
        price: 1680,
        rating: 4.9,
        image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=5%20star%20hotel%20with%20city%20view&image_size=landscape_4_3',
        amenities: ['免费WiFi', '停车场', '健身房', '游泳池', ' spa'],
        distance: '1.2km',
        available: true,
        freeCancellation: true,
        collectionCount: 256
      },
      {
        id: 3,
        name: '北京三里屯通盈中心洲际酒店',
        address: '北京市朝阳区南三里屯路1号',
        price: 1480,
        rating: 4.7,
        image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20hotel%20near%20shopping%20district&image_size=landscape_4_3',
        amenities: ['免费WiFi', '停车场', '健身房', '餐厅', '酒吧'],
        distance: '1.8km',
        available: true,
        freeCancellation: false,
        collectionCount: 89
      }
    ];
    
    // 根据排序类型对酒店数据进行排序
    let sortedHotels = [...hotels];
    if (sortType === 'price_asc') {
      // 价格升序
      sortedHotels.sort((a, b) => a.price - b.price);
    } else if (sortType === 'price_desc') {
      // 价格降序
      sortedHotels.sort((a, b) => b.price - a.price);
    } else if (sortType === 'distance') {
      // 距离由近及远
      sortedHotels.sort((a, b) => {
        const distanceA = parseFloat(a.distance.replace('km', ''));
        const distanceB = parseFloat(b.distance.replace('km', ''));
        return distanceA - distanceB;
      });
    }
    
    return {
      success: true,
      data: {
        hotels: sortedHotels,
        total: sortedHotels.length,
        page: 1,
        pageSize: 10
      }
    };
  }

  // 城市列表模拟数据
  if (url.includes('/cities')) {
    return {
      success: true,
      data: {
        cities: [
          { id: 1, name: '北京' },
          { id: 2, name: '上海' },
          { id: 3, name: '广州' },
          { id: 4, name: '深圳' },
          { id: 5, name: '杭州' },
          { id: 6, name: '成都' },
          { id: 7, name: '重庆' },
          { id: 8, name: '西安' }
        ]
      }
    };
  }

  // 位置信息模拟数据
  if (url.includes('/location')) {
    return {
      success: true,
      data: {
        city: '北京',
        district: '东城区',
        address: '北京市东城区王府井附近'
      }
    };
  }

  // 默认返回
  return {
    success: false,
    message: 'API not implemented yet'
  };
}



// 位置相关API
export const locationApi = {
  // 获取城市列表
  getCities: async () => {
    return request('/cities');
  },

  // 根据坐标获取位置信息
  getLocationByCoords: async (latitude, longitude) => {
    return request(`/location?lat=${latitude}&lng=${longitude}`);
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
    return request('/mobile/hotels/search', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // 获取酒店详情
  getHotelDetail: async (hotelId) => {
    return request(`/mobile/hotels/${hotelId}`);
  },

  // 获取酒店评论
  getHotelReviews: async (hotelId, params) => {
    const queryString = new URLSearchParams(params).toString();
    return request(`/mobile/hotels/${hotelId}/reviews?${queryString}`);
  }
};

// 订单相关API
export const orderApi = {
  // 获取订单列表
  getOrders: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    return request(`/mobile/orders?${queryString}`);
  },

  // 获取订单详情
  getOrderDetail: async (orderId) => {
    return request(`/mobile/orders/${orderId}`);
  },

  // 创建订单
  createOrder: async (orderData) => {
    return request('/mobile/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  // 取消订单
  cancelOrder: async (orderId) => {
    return request(`/mobile/orders/${orderId}/cancel`, {
      method: 'POST',
    });
  },

  // 支付订单
  payOrder: async (orderId, paymentData) => {
    return request(`/mobile/orders/${orderId}/pay`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }
};

// 收藏相关API
export const favoriteApi = {
  // 获取收藏列表
  getFavorites: async () => {
    return request('/mobile/favorites');
  },

  // 添加收藏
  addFavorite: async (hotelId) => {
    return request('/mobile/favorites', {
      method: 'POST',
      body: JSON.stringify({ hotel_id: hotelId }),
    });
  },

  // 删除收藏
  removeFavorite: async (hotelId) => {
    return request(`/mobile/favorites/${hotelId}`, {
      method: 'DELETE',
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
    return request('/mobile/coupons');
  },

  // 使用优惠券
  useCoupon: async (couponId, orderId) => {
    return request(`/mobile/coupons/${couponId}/use`, {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId }),
    });
  }
};
