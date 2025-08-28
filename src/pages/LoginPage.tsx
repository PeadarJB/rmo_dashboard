// src/pages/LoginPage.tsx
import React, { useEffect, useRef } from 'react';
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
  const redirectingRef = useRef(false);

  // If already authenticated, bounce to the target page
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const returnTo = location.state?.from?.pathname || '/';
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, location.state, navigate]);

  const handleLogin = () => {
    if (redirectingRef.current) return;

    const returnPath = location.state?.from?.pathname || '/';
    if (returnPath !== '/') {
      sessionStorage.setItem('auth_return_path', returnPath);
    }

    redirectingRef.current = true;
    redirectToHostedUI(); // Hosted UI + PKCE
  };

  // Optional: Auto-redirect as soon as we know there's no session
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // uncomment to auto-redirect; otherwise the user clicks the button
      // handleLogin();
    }
  }, [isLoading, isAuthenticated]);

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
            <img src="/img/RMO_Logo.png" alt="RMO Logo" className={styles.logo} />
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
              You’ll be redirected to your organization’s login page
            </Text>
          </div>
        </Card>
      </Content>
    </Layout>
  );
};

export default LoginPage;
