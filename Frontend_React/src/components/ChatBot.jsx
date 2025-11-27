import React, { useState, useRef, useEffect } from 'react';
import { chatAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './ChatBot.css';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      text: 'Xin chào! Tôi là AI Dược sĩ của Medicare. Tôi có thể giúp gì cho bạn? Bạn có thể hỏi về thuốc, triệu chứng, hoặc sản phẩm bạn cần.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const response = await chatAPI.sendMessage(currentInput);
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: response.reply,
        products: response.suggested_products || [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: 'Xin lỗi, tôi gặp lỗi khi xử lý. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        className="chatbot-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Chatbot"
      >
        <i className="fas fa-comments"></i>
        {!isOpen && messages.length > 1 && (
          <span className="chatbot-badge">1</span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-container">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <i className="fas fa-robot"></i>
              <div>
                <h3>AI Dược sĩ</h3>
                <p>Medicare Assistant</p>
              </div>
            </div>
            <button
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close Chatbot"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chatbot-message ${message.type}`}
              >
                <div className="message-content">
                  <p>{message.text}</p>
                  
                  {/* Hiển thị sản phẩm gợi ý */}
                  {message.products && message.products.length > 0 && (
                    <div className="suggested-products">
                      <p className="products-label">Sản phẩm gợi ý:</p>
                      {message.products.map((product) => (
                        <div
                          key={product._id}
                          className="product-suggestion"
                          onClick={() => handleProductClick(product._id)}
                        >
                          <div className="product-info">
                            <h4>{product.name}</h4>
                            <p className="product-price">${product.price}</p>
                          </div>
                          <button className="view-product-btn">
                            Xem chi tiết <i className="fas fa-arrow-right"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
            
            {loading && (
              <div className="chatbot-message ai">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập câu hỏi của bạn..."
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="send-button"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;

