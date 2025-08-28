// src/pages/LoginPage.tsx
import React, { useEffect } from 'react';
import { Layout, Card, Typography, Button, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { redirectToHostedUI } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import styles from './LoginPage.module.css';

const { Content } = Layout;
const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  // Check if user is already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // If already authenticated, redirect to originally requested page or dashboard
      const returnTo = location.state?.from?.pathname || '/';
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, location.state, navigate]);

  const handleLogin = () => {
    // Store the return path in sessionStorage before redirecting to Cognito
    // This preserves it through the OAuth flow since we leave the app
    const returnPath = location.state?.from?.pathname || '/';
    if (returnPath !== '/') {
      sessionStorage.setItem('auth_return_path', returnPath);
    }
    
    // Redirect to Cognito Hosted UI
    redirectToHostedUI();
  };

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <Layout className={styles.layout}>
        <Content className={styles.content}>
          <Spin 
            indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
            size="large"
            tip="Checking authentication status..."
          />
        </Content>
      </Layout>
    );
  }

  // If already authenticated (edge case), show a message
  if (isAuthenticated) {
    return (
      <Layout className={styles.layout}>
        <Content className={styles.content}>
          <Card className={styles.loginCard}>
            <Spin 
              indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
              tip="Already logged in. Redirecting..."
            />
          </Card>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className={styles.layout}>
      <Content className={styles.content}>
        <Card className={styles.loginCard}>
          <div className={styles.header}>
            <img
              src="/img/RMO_Logo.png"
              alt="RMO Logo"
              className={styles.logo}
            />
            <Title level={3}>RMO Dashboard</Title>
            <Text type="secondary">Regional Road Management Analytics</Text>
          </div>
          
          <Button
            type="primary"
            size="large"
            block
            onClick={handleLogin}
            className={styles.loginButton}
          >
            Sign in with Corporate Account
          </Button>
          
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              You will be redirected to your organization's login page
            </Text>
          </div>
        </Card>
      </Content>
    </Layout>
  );
};

export default LoginPage;