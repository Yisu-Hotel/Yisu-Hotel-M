// 注意：导入 React 原生的 useState/useEffect，而非 Taro 的
import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Image, ScrollView, Swiper, SwiperItem } from '@tarojs/components';
import { hotelApi } from '../../services/api';
import './index.less';

export default function HotelDetail() {
  // 修复：使用 React 原生 useState
  const [hotelData, setHotelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    roomTypes: [],
    facilities: [],
    services: []
  });

  useEffect(() => {
    // 强制从URL解析id（兼容H5端）
    const urlParams = new URLSearchParams(window.location.search);
    const hotelId = urlParams.get('id') || "1"; // 兜底id=1

    // 使用真实API调用获取酒店详情
    const fetchHotelDetail = async () => {
      try {
        setLoading(true);
        const response = await hotelApi.getHotelDetail(hotelId);
        
        if (response.code === 0 && response.data) {
          // 格式化数据以匹配前端期望的格式
          const formattedData = {
            bannerList: [response.data.main_image_url],
            hotelInfo: {
              name: response.data.name,
              tag: '',
              openYear: '',
              features: response.data.facilities.map(f => f.name),
              score: response.data.rating,
              commentCount: 0,
              scoreDesc: '',
              distance: `${response.data.distance.toFixed(1)}km`,
              address: response.data.address
            },
            discountTags: [],
            dateRange: '',
            stayNight: '1晚',
            roomGuest: '1间 1人',
            roomList: [
              {
                id: 'room1',
                name: '标准间',
                desc: '1张1.8米床',
                note: '入住时间14:00后 | 退房时间12:00前',
                service: response.data.services.map(s => s.name).join(' | '),
                tags: ['免费取消', '含早餐'],
                originalPrice: response.data.min_price + 100,
                currentPrice: response.data.min_price,
                img: response.data.main_image_url
              }
            ]
          };
          setHotelData(formattedData);
        } else {
          Taro.showToast({
            title: response.msg || '获取酒店详情失败',
            icon: 'none'
          });
        }
      } catch (error) {
        console.error('获取酒店详情失败:', error);
        Taro.showToast({
          title: '获取酒店详情失败，请检查网络连接',
          icon: 'none'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHotelDetail();
  }, []);

  // 处理筛选标签点击
  const handleFilterTagClick = (tag) => {
    setSelectedFilters(prev => {
      if (prev.includes(tag)) {
        return prev.filter(item => item !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  // 处理筛选按钮点击
  const handleFilterClick = () => {
    console.log('筛选按钮点击');
    // 切换筛选面板的显示状态
    setShowFilterPanel(!showFilterPanel);
  };

  // 处理筛选选项点击
  const handleFilterOptionClick = (category, option) => {
    setFilterOptions(prev => {
      const currentOptions = prev[category];
      if (currentOptions.includes(option)) {
        // 取消选择
        return {
          ...prev,
          [category]: currentOptions.filter(item => item !== option)
        };
      } else {
        // 选择
        return {
          ...prev,
          [category]: [...currentOptions, option]
        };
      }
    });
  };

  // 处理重置筛选
  const handleResetFilter = () => {
    setFilterOptions({
      roomTypes: [],
      facilities: [],
      services: []
    });
  };

  // 处理确定筛选
  const handleConfirmFilter = () => {
    console.log('确定筛选', filterOptions);
    // 这里可以根据筛选选项过滤房间列表
    // 暂时只关闭筛选面板
    setShowFilterPanel(false);
    // 显示筛选成功提示
    Taro.showToast({
      title: '筛选已应用',
      icon: 'none'
    });
  };

  // 加载中状态
  if (loading) {
    return (
      <View className="loading-container">
        <Text className="loading-text">加载中...</Text>
      </View>
    );
  }

  // 无数据兜底
  if (!hotelData) {
    return (
      <View className="loading-container">
        <Text className="loading-text">暂无酒店信息</Text>
      </View>
    );
  }

  // 主渲染
  return (
    <ScrollView className="hotel-detail-page">
      {/* 返回按钮 */}
      <View className="back-btn" onClick={() => Taro.navigateBack()}>
        <Text className="back-icon">←</Text>
        <Text className="back-text">返回</Text>
      </View>

      {/* 顶部轮播图 */}
      <Swiper className="banner-swiper">
        {hotelData.bannerList.map((img, idx) => (
          <SwiperItem key={idx}>
            <Image className="banner-img" src={img} mode="widthFix" />
          </SwiperItem>
        ))}
      </Swiper>

      {/* 酒店名称+标签 */}
      <View className="hotel-header">
        <Text className="hotel-name">{hotelData.hotelInfo.name}</Text>
        <Text className="hotel-tag">{hotelData.hotelInfo.tag}</Text>
      </View>

      {/* 设施图标栏 */}
      <View className="facilities-row">
        <Text className="facility-item">
          <Text className="facility-icon">📶</Text>
          <Text className="facility-text">WiFi</Text>
        </Text>
        <Text className="facility-item">
          <Text className="facility-icon">🚗</Text>
          <Text className="facility-text">停车场</Text>
        </Text>
        <Text className="facility-item">
          <Text className="facility-icon">🧹</Text>
          <Text className="facility-text">清洁</Text>
        </Text>
        <Text className="facility-item">
          <Text className="facility-icon">👨‍💼</Text>
          <Text className="facility-text">服务</Text>
        </Text>
        <Text className="facility-more">更多 ▾</Text>
      </View>

      {/* 评分+位置栏 */}
      <View className="score-address-row">
        <View className="score-block">
          <Text className="score">{hotelData.hotelInfo.score}</Text>
          <Text className="score-level">超棒</Text>
          <Text className="comment-count">{hotelData.hotelInfo.commentCount}条 &gt;</Text>
          <Text className="score-desc">{hotelData.hotelInfo.scoreDesc}</Text>
        </View>
        <View className="address-block">
          <Text className="distance">{hotelData.hotelInfo.distance}</Text>
          <Text className="address">{hotelData.hotelInfo.address}</Text>
          <Text className="map-btn">查看地图</Text>
        </View>
      </View>

      {/* 优惠标签栏 */}
      <View className="discount-row">
        {hotelData.discountTags.map((tag, idx) => (
          <Text key={idx} className="discount-tag">{tag}</Text>
        ))}
        <Text className="coupon-btn">领券</Text>
      </View>

      {/* 日期+房间人数栏 */}
      <View className="date-guest-row">
        <View className="date-part">
          <Text className="date">{hotelData.dateRange}</Text>
          <Text className="night">{hotelData.stayNight}</Text>
        </View>
        <Text className="guest">{hotelData.roomGuest}</Text>
      </View>

      {/* 房型筛选栏 */}
      <View className="room-filter-row">
        <Text 
          className={`filter-tag ${selectedFilters.includes('双床房') ? 'selected' : ''}`} 
          onClick={() => handleFilterTagClick('双床房')}
        >
          双床房
        </Text>
        <Text 
          className={`filter-tag ${selectedFilters.includes('家庭房') ? 'selected' : ''}`} 
          onClick={() => handleFilterTagClick('家庭房')}
        >
          家庭房
        </Text>
        <Text 
          className={`filter-tag ${selectedFilters.includes('大床房') ? 'selected' : ''}`} 
          onClick={() => handleFilterTagClick('大床房')}
        >
          大床房
        </Text>
        <Text 
          className={`filter-tag ${selectedFilters.includes('免费取消') ? 'selected' : ''}`} 
          onClick={() => handleFilterTagClick('免费取消')}
        >
          免费取消
        </Text>
        <Text 
          className={`filter-tag ${selectedFilters.includes('≥35㎡') ? 'selected' : ''}`} 
          onClick={() => handleFilterTagClick('≥35㎡')}
        >
          ≥35㎡
        </Text>
        <View className="filter-more" onClick={handleFilterClick}>
          筛选 ▾
        </View>
      </View>

      {/* 房型列表 */}
      <View className="room-list">
        <View className="recommend-tag">
          <Text className="tag-icon">♦</Text>
          <Text className="tag-text">猜您喜欢 本店大床房销量No.1</Text>
        </View>
        {hotelData.roomList.map((room) => (
          <View key={room.id} className="room-item">
            <Image className="room-img" src={room.img} mode="widthFix" />
            <View className="room-info">
              <View className="room-header">
                <Text className="room-name">{room.name}</Text>
                <Text className="room-code">{room.id}</Text>
              </View>
              <Text className="room-desc">{room.desc}</Text>
              <Text className="room-note">{room.note}</Text>
              <Text className="room-service">{room.service}</Text>
              <View className="room-tags">
                {room.tags.map((tag, idx) => (
                  <Text key={idx} className="tag">{tag}</Text>
                ))}
              </View>
              <View className="price-book-row">
                <View className="price-part">
                  <Text className="original-price">¥{room.originalPrice}</Text>
                  <Text className="current-price">¥{room.currentPrice}</Text>
                  <Text className="discount-info">新客体验钻石 会员出行 4项优惠</Text>
                </View>
                {/* 核心修改：跳转路径改为 /pages/booking-confirm/index */}
                <View 
                  className="book-btn" 
                  onClick={() => Taro.navigateTo({
                    url: '/pages/booking-confirm/index'
                  })}
                >
                  预订
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* 筛选面板 */}
      {showFilterPanel && (
        <View className="filter-panel">
          <View className="filter-panel-header">
            <Text className="filter-panel-title">筛选</Text>
            <Text className="filter-panel-close" onClick={handleFilterClick}>×</Text>
          </View>
          <ScrollView className="filter-panel-content">
            {/* 房型 */}
            <View className="filter-section">
              <Text className="filter-section-title">房型</Text>
              <View className="filter-options">
                <Text 
                  className={`filter-option ${filterOptions.roomTypes.includes('大床房') ? 'selected' : ''}`}
                  onClick={() => handleFilterOptionClick('roomTypes', '大床房')}
                >
                  大床房
                </Text>
                <Text 
                  className={`filter-option ${filterOptions.roomTypes.includes('双床房') ? 'selected' : ''}`}
                  onClick={() => handleFilterOptionClick('roomTypes', '双床房')}
                >
                  双床房
                </Text>
                <Text 
                  className={`filter-option ${filterOptions.roomTypes.includes('三床房') ? 'selected' : ''}`}
                  onClick={() => handleFilterOptionClick('roomTypes', '三床房')}
                >
                  三床房
                </Text>
                <Text 
                  className={`filter-option ${filterOptions.roomTypes.includes('电竞房') ? 'selected' : ''}`}
                  onClick={() => handleFilterOptionClick('roomTypes', '电竞房')}
                >
                  电竞房
                </Text>
                <Text 
                  className={`filter-option ${filterOptions.roomTypes.includes('多床房') ? 'selected' : ''}`}
                  onClick={() => handleFilterOptionClick('roomTypes', '多床房')}
                >
                  多床房
                </Text>
              </View>
            </View>
            
            {/* 设施 */}
            <View className="filter-section">
              <Text className="filter-section-title">设施</Text>
              <View className="filter-options">
                <Text 
                  className={`filter-option ${filterOptions.facilities.includes('空调') ? 'selected' : ''}`}
                  onClick={() => handleFilterOptionClick('facilities', '空调')}
                >
                  空调
                </Text>
                <Text 
                  className={`filter-option ${filterOptions.facilities.includes('电脑') ? 'selected' : ''}`}
                  onClick={() => handleFilterOptionClick('facilities', '电脑')}
                >
                  电脑
                </Text>
                <Text 
                  className={`filter-option ${filterOptions.facilities.includes('客房宽带') ? 'selected' : ''}`}
                  onClick={() => handleFilterOptionClick('facilities', '客房宽带')}
                >
                  客房宽带
                </Text>
                <Text 
                  className={`filter-option ${filterOptions.facilities.includes('吹风机') ? 'selected' : ''}`}
                  onClick={() => handleFilterOptionClick('facilities', '吹风机')}
                >
                  吹风机
                </Text>
              </View>
            </View>
            
            {/* 服务优选 */}
            <View className="filter-section">
              <Text className="filter-section-title">服务优选</Text>
              <View className="filter-options">
                <Text 
                  className={`filter-option ${filterOptions.services.includes('可取消') ? 'selected' : ''}`}
                  onClick={() => handleFilterOptionClick('services', '可取消')}
                >
                  可取消
                </Text>
                <Text 
                  className={`filter-option ${filterOptions.services.includes('不满意退') ? 'selected' : ''}`}
                  onClick={() => handleFilterOptionClick('services', '不满意退')}
                >
                  不满意退
                </Text>
                <Text 
                  className={`filter-option ${filterOptions.services.includes('可订') ? 'selected' : ''}`}
                  onClick={() => handleFilterOptionClick('services', '可订')}
                >
                  可订
                </Text>
              </View>
            </View>
          </ScrollView>
          <View className="filter-panel-footer">
            <Text className="filter-reset-btn" onClick={handleResetFilter}>重置</Text>
            <View className="filter-confirm-btn" onClick={handleConfirmFilter}>
              <Text className="filter-confirm-text">确定</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
