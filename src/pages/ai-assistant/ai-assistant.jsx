import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Textarea, ScrollView } from '@tarojs/components';
import Taro, { navigateTo } from '@tarojs/taro';
import { aiApi } from '../../services/api';
import './ai-assistant.less';

const CHAT_STORAGE_KEY = 'mobile_chat_history';
const MAX_CHAT_ROUNDS = 10;
const MAX_CHAT_MESSAGES = MAX_CHAT_ROUNDS * 2;

const trimChatMessages = (messages) => messages.slice(-MAX_CHAT_MESSAGES);

export default function AIAssistant() {
  const [messages, setMessages] = useState(() => {
    const raw = Taro.getStorageSync(CHAT_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return trimChatMessages(parsed.filter((item) => item && typeof item === 'object' && typeof item.role === 'string' && typeof item.content === 'string'));
    } catch (error) {
      return [];
    }
  });
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const scrollViewRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      try {
        const scrollView = scrollViewRef.current;
        if (scrollView) {
          scrollView.scrollTop = scrollView.scrollHeight;
        }
      } catch (error) {
        console.error('滚动到底部失败:', error);
      }
    }, 100);
  }, [messages]);

  useEffect(() => {
    Taro.setStorageSync(CHAT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const handleSendMessage = async () => {
    if (loading) {
      return;
    }
    const content = inputText.trim();
    if (!content) {
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString()
    };

    const nextMessages = trimChatMessages([...messages, userMessage]);
    const requestMessages = nextMessages.filter((message) => message.role !== 'tool');
    setMessages(nextMessages);
    setInputText('');
    setChatError('');
    setLoading(true);

    try {
      const result = await aiApi.chat(requestMessages);
      if (result.code !== 0 || !result.data?.message?.content) {
        throw new Error(result.msg || 'AI服务返回异常');
      }
      const assistantContent = result.data.message.content;
      const toolCalls = Array.isArray(result?.data?.tool_calls) ? result.data.tool_calls : [];
      const toolMessages = toolCalls.flatMap((call) => {
        const name = call?.name || 'knowledge_base_search';
        const input = call?.input || {};
        const output = call?.output || {};

        let callContent = '';
        let resultContent = '';

        if (name === 'knowledge_base_search') {
          callContent = `🔍 正在检索知识库：\n"${input.query || ''}"`;
          const matches = output.matches || [];
          if (matches.length > 0) {
            resultContent = `✅ 找到 ${matches.length} 条相关参考：\n` +
              matches.map((m, i) => `${i + 1}. 【${m.question}】\n   ${m.answer}`).join('\n\n');
          } else {
            resultContent = '❌ 未能在知识库中找到直接匹配的内容。';
          }
        } else {
          const inputTextValue = JSON.stringify(input, null, 2);
          const outputTextValue = JSON.stringify(output, null, 2);
          callContent = `工具调用：${name}${inputTextValue ? `\n${inputTextValue}` : ''}`;
          resultContent = `工具结果：${outputTextValue || '无匹配结果'}`;
        }

        return [
          { id: `${Date.now()}-${Math.random()}`, role: 'tool', content: callContent },
          { id: `${Date.now()}-${Math.random()}`, role: 'tool', content: resultContent }
        ];
      });

      setMessages(trimChatMessages([
        ...nextMessages,
        ...toolMessages,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date().toLocaleTimeString()
        }
      ]));
    } catch (error) {
      setChatError(error.message || 'AI服务异常');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    Taro.showModal({
      title: '清空对话',
      content: '确定要清空目前的对话历史吗？',
      success: (res) => {
        if (res.confirm) {
          setMessages([]);
          setChatError('');
        }
      }
    });
  };

  return (
    <View className="ai-assistant-container">
      <View className="ai-assistant-header">
        <View
          className="back-button"
          onClick={() => navigateTo({ url: '/pages/my/my' })}
        >
          <Text className="back-icon">←</Text>
        </View>
        <View className="header-info">
          <View className="header-avatar">
            <Text className="header-avatar-text">AI</Text>
          </View>
          <View className="header-text">
            <Text className="header-title">易宿 AI 助手</Text>
            <View className="header-status">
              <View className="status-dot" />
              <Text className="status-text">在线</Text>
            </View>
          </View>
        </View>
        <View className="header-actions">
          <Text className="clear-text" onClick={handleClearChat}>清空对话</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        className="chat-container"
        scrollY
        style={{ flex: 1 }}
      >
        <View className="messages-list">
          {messages.length === 0 ? (
            <View className="empty-state">
              <Text className="empty-text">先描述你的问题或需求，AI 将帮助你快速解答。</Text>
            </View>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user';
              const isTool = message.role === 'tool';
              return (
                <View
                  key={message.id}
                  className={`message-item ${isUser ? 'user-message' : isTool ? 'tool-message' : 'assistant-message'}`}
                >
                  {!isUser && !isTool && (
                    <View className="avatar-container">
                      <View className="avatar assistant-avatar">
                        <Text className="avatar-icon">AI</Text>
                      </View>
                    </View>
                  )}
                  <View className="message-content">
                    <Text className="message-text">{message.content}</Text>
                    {message.timestamp ? (
                      <Text className="message-timestamp">{message.timestamp}</Text>
                    ) : null}
                  </View>

                </View>
              );
            })
          )}

          {loading ? (
            <View className="message-item assistant-message">
              <View className="avatar-container">
                <View className="avatar assistant-avatar">
                  <Text className="avatar-icon">AI</Text>
                </View>
              </View>
              <View className="message-content">
                <Text className="loading-text">AI 正在思考...</Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {chatError ? (
        <View className="error-banner">
          <Text className="error-text">{chatError}</Text>
        </View>
      ) : null}

      <View className="input-container">
        <Textarea
          className="input-field"
          placeholder="输入你的问题，Enter 发送"
          value={inputText}
          onInput={(e) => setInputText(e.detail.value)}
          onConfirm={() => {
            if (!loading) {
              handleSendMessage();
            }
          }}
          autoHeight
          maxlength={500}
        />
        <View
          className={`send-button ${!inputText.trim() || loading ? 'disabled' : ''}`}
          onClick={handleSendMessage}
          style={{ pointerEvents: (!inputText.trim() || loading) ? 'none' : 'auto' }}
        >
          <Text className="send-icon">发送</Text>
        </View>
      </View>
    </View>
  );
}
