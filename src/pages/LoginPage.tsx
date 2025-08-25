// src/pages/LoginPage.tsx
import React from 'react';
import { Card, Form, Input, Button, Typography, Space, message } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import styles from './LoginPage.module.css';
import { signIn } from 'aws-amplify/auth'; // 👈 Import the signIn function

const { Title, Text } = Typography;

export const LoginPage: React.FC = () => {
  const setAuthenticated = useAnalyticsStore((state) => state.setAuthenticated);

  // 👇 This function will now handle the real sign-in process
  const onFinish = async (values: any) => {
    try {
      const { isSignedIn } = await signIn({
        username: values.username,
        password: values.password,
      });

      if (isSignedIn) {
        setAuthenticated(true);
      }
    } catch (error) {
      console.error('Error signing in', error);
      message.error('Login failed. Please check your username and password.');
    }
  };

  return (
    // ... the rest of your component remains the same
    <div className={styles.loginContainer}>
      <Card className={styles.loginCard}>
        <Space direction="vertical" align="center" style={{ width: '100%' }}>
          <Title level={2}>RMO Dashboard</Title>
          <Text type="secondary">Please sign in to continue</Text>
        </Space>

        <Form
          name="normal_login"
          className={styles.loginForm}
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your Username!' }]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder="Username"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input
              prefix={<LockOutlined className="site-form-item-icon" />}
              type="password"
              placeholder="Password"
            />
          </Form.Item>
          
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className={styles.loginFormButton}
              icon={<LoginOutlined />}
            >
              Log in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};