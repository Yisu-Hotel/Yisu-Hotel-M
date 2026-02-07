import Taro, { useState } from '@tarojs/taro';
import { View, Text, Image, ScrollView, Swiper, SwiperItem } from '@tarojs/components';
import './index.less';

// 匹配参考图的模拟数据
const mockData = {
  bannerList: [
    'https://img95.699pic.com/photo/50120/2224.jpg_wh860.jpg'
  ],
  hotelInfo: {
    name: '回坊轩礼精品酒店(西安回民街钟楼地铁站店)',
    tag: '优享会',
    openYear: '2019年开业',
    features: ['拍照出片', '租车服务', '家庭房', '无烟楼层'],
    score: 4.7,
    commentCount: 1951,
    scoreDesc: '环境干净舒适位置方便',
    distance: '距西安钟楼步行670米',
    address: '莲湖区钟鼓楼北院门125号'
  },
  discountTags: ['订房优惠', '首住特惠', '85折起', '立减10', '惊喜红包'],
  dateRange: '2月7日 今天 - 2月8日 明天',
  stayNight: '1晚',
  roomGuest: '1间 1人 0儿童',
  roomList: [
    {
      id: '9G7GBK',
      name: '舒雅大床房',
      desc: '1张1.8米大床 2人入住 20-25㎡',
      note: '窗户位于走廊或过道',
      service: '无早餐 入住当天23:00前可免费取消',
      tags: ['在线付', '立即确认', '部分禁烟'],
      originalPrice: 369,
      currentPrice: 141,
      img: 'https://img95.699pic.com/photo/50120/2225.jpg_wh300.jpg!/fh/300/quality/90',
      bookingToken: 'booking_9G7GBK_20260207'
    }
  ]
};

export default function HotelDetail() {
  const handleBookClick = (roomId, bookingToken) => {
    Taro.navigateTo({
      url: `/pages/booking-confirm/index?roomId=${roomId}&bookingToken=${bookingToken}`
    });
  };

  return (
    <ScrollView className="hotel-detail-page" scrollY>
      {/* 顶部轮播图（匹配参考图） */}
      <Swiper className="banner-swiper" indicatorDots circular autoplay>
        {mockData.bannerList.map((img, idx) => (
          <SwiperItem key={idx}>
            <Image className="banner-img" src={img} mode="widthFix" />
            {/* 房型标签（轮播图上） */}
            <View className="banner-room-tag">轻奢大床房</View>
            <View className="banner-room-desc">40m² / 3-6层 / 2张1.3米单人床</View>
          </SwiperItem>
        ))}
      </Swiper>

      {/* 酒店名称+标签栏 */}
      <View className="hotel-header">
        <Text className="hotel-name">{mockData.hotelInfo.name}</Text>
        <Text className="hotel-tag">{mockData.hotelInfo.tag}</Text>
      </View>

      {/* 设施图标栏 */}
      <View className="facilities-row">
        <View className="facility-item">
          <Text className="facility-icon">🏢</Text>
          <Text className="facility-text">{mockData.hotelInfo.openYear}</Text>
        </View>
        <View className="facility-item">
          <Text className="facility-icon">📸</Text>
          <Text className="facility-text">拍照出片</Text>
        </View>
        <View className="facility-item">
          <Text className="facility-icon">🚗</Text>
          <Text className="facility-text">租车服务</Text>
        </View>
        <View className="facility-item">
          <Text className="facility-icon">👨‍👩‍👧</Text>
          <Text className="facility-text">家庭房</Text>
        </View>
        <View className="facility-item">
          <Text className="facility-icon">🚭</Text>
          <Text className="facility-text">无烟楼层</Text>
        </View>
        <View className="facility-more">设施政策 &gt;</View>
      </View>

      {/* 评分+位置栏 */}
      <View className="score-address-row">
        <View className="score-block">
          <Text className="score">{mockData.hotelInfo.score}</Text>
          <Text className="score-level">超棒</Text>
          <Text className="comment-count">{mockData.hotelInfo.commentCount}条 &gt;</Text>
          <Text className="score-desc">“{mockData.hotelInfo.scoreDesc}”</Text>
        </View>
        <View className="address-block">
          <Text className="distance">{mockData.hotelInfo.distance}</Text>
          <Text className="address">{mockData.hotelInfo.address}</Text>
          <View className="map-btn">地图</View>
        </View>
      </View>

      {/* 优惠标签栏 */}
      <View className="discount-row">
        {mockData.discountTags.map((tag, idx) => (
          <Text key={idx} className="discount-tag">{tag}</Text>
        ))}
        <View className="coupon-btn">领券</View>
      </View>

      {/* 日期+房间人数栏 */}
      <View className="date-guest-row">
        <View className="date-part">
          <Text className="date">{mockData.dateRange}</Text>
          <Text className="night">共{mockData.stayNight}</Text>
        </View>
        <View className="guest-part">
          <Text className="guest">{mockData.roomGuest}</Text>
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

      {/* 房型列表（匹配参考图） */}
      <View className="room-list">
        <View className="recommend-tag">
          <Text className="tag-icon">♦</Text>
          <Text className="tag-text">猜您喜欢 本店大床房销量No.1</Text>
        </View>
        {mockData.roomList.map((room) => (
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
                  <Text className="discount-info">新客体验钻石 会员出行 4项优惠228</Text>
                </View>
                <View 
                  className="book-btn" 
                  onClick={() => handleBookClick(room.id, room.bookingToken)}
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