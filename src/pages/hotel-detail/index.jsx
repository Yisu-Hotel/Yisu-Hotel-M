// 注意：导入 React 原生的 useState/useEffect，而非 Taro 的
import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Image, ScrollView, Swiper, SwiperItem } from '@tarojs/components';
import './index.less';

// 模拟数据（包含id=1的酒店，匹配你当前URL参数）
const mockHotelData = {
  "1": {
    bannerList: ['https://img95.699pic.com/photo/50120/2224.jpg_wh860.jpg'],
    hotelInfo: {
      name: '北京王府井希尔顿酒店',
      tag: '优享会',
      openYear: '2019年开业',
      features: ['免费WiFi', '停车场'],
      score: 4.8,
      commentCount: 128,
      scoreDesc: '环境干净舒适',
      distance: '距地铁站0.5km',
      address: '北京市东城区王府井东街8号'
    },
    discountTags: ['订房优惠', '首住特惠'],
    dateRange: '2月8日 - 2月9日',
    stayNight: '1晚',
    roomGuest: '1间 1人',
    roomList: [
      {
        id: 'room1',
        name: '舒适大床房',
        desc: '1张1.8米床',
        note: '朝南采光好',
        service: '无早餐',
        tags: ['在线付'],
        originalPrice: 1280,
        currentPrice: 1080,
        img: 'https://img95.699pic.com/photo/50120/2225.jpg_wh300.jpg'
      }
    ]
  },
  "18": {
    bannerList: ['https://img95.699pic.com/photo/50120/2224.jpg_wh860.jpg'],
    hotelInfo: {
      name: '测试酒店18',
      tag: '特惠优选',
      openYear: '2020年开业',
      features: ['免费WiFi', '停车场'],
      score: 4.5,
      commentCount: 800,
      scoreDesc: '性价比超高',
      distance: '距地铁站500米',
      address: '测试区测试路18号'
    },
    discountTags: ['订房优惠', '首住特惠'],
    dateRange: '2月7日 - 2月8日',
    stayNight: '1晚',
    roomGuest: '1间 1人',
    roomList: [
      {
        id: 'room18',
        name: '舒适大床房',
        desc: '1张1.8米床',
        note: '朝南采光好',
        service: '无早餐',
        tags: ['在线付'],
        originalPrice: 299,
        currentPrice: 189,
        img: 'https://img95.699pic.com/photo/50120/2225.jpg_wh300.jpg'
      }
    ]
  }
};

export default function HotelDetail() {
  // 修复：使用 React 原生 useState
  const [hotelData, setHotelData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 强制从URL解析id（兼容H5端）
    const urlParams = new URLSearchParams(window.location.search);
    const hotelId = urlParams.get('id') || "1"; // 兜底id=1

    // 匹配数据
    const data = mockHotelData[hotelId] || mockHotelData["1"];
    
    // 模拟加载延迟，避免渲染过快
    setTimeout(() => {
      setHotelData(data);
      setLoading(false);
    }, 300);
  }, []);

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
      <View className="empty-container">
        <Text>未找到酒店数据</Text>
      </View>
    );
  }

  return (
    <ScrollView className="hotel-detail-page" scrollY>
      {/* 返回按钮 */}
      <View className="back-btn" onClick={() => Taro.navigateBack()}>
        <Text className="back-icon">←</Text>
        <Text className="back-text">返回酒店列表</Text>
      </View>

      {/* 轮播图 */}
      <Swiper className="banner-swiper" indicatorDots circular autoplay>
        {hotelData.bannerList.map((img, idx) => (
          <SwiperItem key={idx}>
            <Image className="banner-img" src={img} mode="widthFix" />
            <View className="banner-room-tag">轻奢大床房</View>
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
        <View className="facility-item">
          <Text className="facility-icon">🏢</Text>
          <Text className="facility-text">{hotelData.hotelInfo.openYear}</Text>
        </View>
        {hotelData.hotelInfo.features.slice(0, 4).map((feature, idx) => (
          <View key={idx} className="facility-item">
            <Text className="facility-icon">
              {feature === '免费WiFi' ? '📶' : 
               feature === '停车场' ? '🅿️' : '🚪'}
            </Text>
            <Text className="facility-text">{feature}</Text>
          </View>
        ))}
        <View className="facility-more">设施政策 &gt;</View>
      </View>

      {/* 评分+位置栏 */}
      <View className="score-address-row">
        <View className="score-block">
          <Text className="score">{hotelData.hotelInfo.score}</Text>
          <Text className="score-level">超棒</Text>
          <Text className="comment-count">{hotelData.hotelInfo.commentCount}条 &gt;</Text>
          <Text className="score-desc">“{hotelData.hotelInfo.scoreDesc}”</Text>
        </View>
        <View className="address-block">
          <Text className="distance">{hotelData.hotelInfo.distance}</Text>
          <Text className="address">{hotelData.hotelInfo.address}</Text>
          <View className="map-btn">地图</View>
        </View>
      </View>

      {/* 优惠标签栏 */}
      <View className="discount-row">
        {hotelData.discountTags.map((tag, idx) => (
          <Text key={idx} className="discount-tag">{tag}</Text>
        ))}
        <View className="coupon-btn">领券</View>
      </View>

      {/* 日期+房间人数栏 */}
      <View className="date-guest-row">
        <View className="date-part">
          <Text className="date">{hotelData.dateRange}</Text>
          <Text className="night">共{hotelData.stayNight}</Text>
        </View>
        <View className="guest-part">
          <Text className="guest">{hotelData.roomGuest}</Text>
        </View>
      </View>

      {/* 房型筛选栏 */}
      <View className="room-filter-row">
        <Text className="filter-tag">双床房</Text>
        <Text className="filter-tag">家庭房</Text>
        <Text className="filter-tag">大床房</Text>
        <Text className="filter-tag">免费取消</Text>
        <Text className="filter-tag">≥35㎡</Text>
        <View className="filter-more">筛选 ▾</View>
      </View>

      {/* 房型列表（核心修改：预订按钮跳转路径） */}
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
    </ScrollView>
  );
}