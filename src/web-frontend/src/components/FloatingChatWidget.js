import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Typography,
  TextField,
  Paper,
  Avatar,
  Stack,
  Chip,
  Fade,
  Slide,
  useTheme,
  alpha,
  Divider,
  Button
} from '@mui/material';
import {
  Chat,
  Close,
  Send,
  SportsBaseball,
  SmartToy,
  Person,
  TrendingUp,
  Timeline,
  Groups
} from '@mui/icons-material';

const FloatingChatWidget = () => {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hey there! I\'m your baseball analytics assistant. Ask me anything about the 2025 MLB season!',
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    setIsTyping(true);

    // Simulate bot response (replace with actual API call later)
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        type: 'bot',
        content: 'Thanks for your question! I\'m still learning, but soon I\'ll be able to analyze your baseball data. Stay tuned! ⚾',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    "Who's leading in home runs?",
    "How are the Astros doing?",
    "Best batting averages this season",
    "Upcoming games today"
  ];

  const handleQuickQuestion = (question) => {
    setMessage(question);
  };

  return (
    <>
      {/* Chat Widget Container */}
      <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
        <Card
          sx={{
            position: 'fixed',
            bottom: 100,
            right: 20,
            width: 400,
            height: 600,
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: theme.shadows[8],
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          {/* Chat Header */}
          <Paper
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              color: 'white',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar sx={{ bgcolor: alpha(theme.palette.common.white, 0.2) }}>
                <SmartToy />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  Cy Cole
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Your friend who thinks he knows baseball
                </Typography>
              </Box>
            </Stack>
            <IconButton 
              onClick={() => setIsOpen(false)}
              sx={{ color: 'white' }}
            >
              <Close />
            </IconButton>
          </Paper>

          {/* Messages Area */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 1,
              bgcolor: alpha(theme.palette.background.default, 0.5)
            }}
          >
            {messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  display: 'flex',
                  justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                  mb: 1
                }}
              >
                <Paper
                  sx={{
                    p: 1.5,
                    maxWidth: '80%',
                    bgcolor: msg.type === 'user' 
                      ? theme.palette.primary.main 
                      : theme.palette.background.paper,
                    color: msg.type === 'user' 
                      ? theme.palette.primary.contrastText 
                      : theme.palette.text.primary,
                    borderRadius: 2,
                    boxShadow: 1
                  }}
                >
                  <Typography variant="body2">
                    {msg.content}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      opacity: 0.7,
                      fontSize: '0.7rem',
                      mt: 0.5,
                      display: 'block'
                    }}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Paper>
              </Box>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                <Paper
                  sx={{
                    p: 1.5,
                    bgcolor: theme.palette.background.paper,
                    borderRadius: 2,
                    boxShadow: 1
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Baseball AI is typing...
                  </Typography>
                </Paper>
              </Box>
            )}

            {/* Quick Questions */}
            {messages.length === 1 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Try asking:
                </Typography>
                <Stack spacing={1}>
                  {quickQuestions.map((question, index) => (
                    <Chip
                      key={index}
                      label={question}
                      variant="outlined"
                      size="small"
                      onClick={() => handleQuickQuestion(question)}
                      sx={{ 
                        alignSelf: 'flex-start',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.1)
                        }
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Box>

          {/* Input Area */}
          <Paper
            sx={{
              p: 2,
              borderTop: `1px solid ${theme.palette.divider}`
            }}
          >
            <Stack direction="row" spacing={1} alignItems="end">
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Ask about MLB stats, players, teams..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                multiline
                maxRows={3}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
              <IconButton
                onClick={handleSendMessage}
                disabled={!message.trim()}
                sx={{
                  bgcolor: theme.palette.primary.main,
                  color: 'white',
                  '&:hover': {
                    bgcolor: theme.palette.primary.dark
                  },
                  '&:disabled': {
                    bgcolor: theme.palette.action.disabled
                  }
                }}
              >
                <Send />
              </IconButton>
            </Stack>
          </Paper>
        </Card>
      </Slide>

      {/* Floating Chat Button */}
      <Fade in={!isOpen}>
        <Paper
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1300,
            borderRadius: '50%',
            width: 60,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: theme.shadows[6],
            '&:hover': {
              transform: 'scale(1.1)',
              boxShadow: theme.shadows[8]
            }
          }}
          onClick={() => setIsOpen(true)}
        >
          <SportsBaseball sx={{ color: 'white', fontSize: 28 }} />
        </Paper>
      </Fade>
    </>
  );
};

export default FloatingChatWidget;
