import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button
} from '@mui/material';
import { Construction } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const ComingSoon = ({ 
  title = "Coming Soon", 
  description = "This feature is currently under development",
  backLink = "/",
  backText = "Back to Dashboard"
}) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ 
        p: 3, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh'
      }}>
        <Card elevation={0} sx={{ maxWidth: 400, textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <Construction 
              sx={{ 
                fontSize: 80, 
                color: 'primary.main', 
                mb: 3,
                opacity: 0.7
              }} 
            />
            
            <Typography variant="h4" fontWeight={700} gutterBottom>
              {title}
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {description}
            </Typography>
            
            <Button 
              variant="contained" 
              onClick={() => navigate(backLink)}
              sx={{ mt: 2 }}
            >
              {backText}
            </Button>
          </CardContent>
        </Card>
      </Box>
    </motion.div>
  );
};

export default ComingSoon;
