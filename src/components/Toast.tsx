'use client';

import { useState, useEffect } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function Toast({ messages, onRemove }: ToastProps) {
  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
      {messages.map(msg => (
        <div
          key={msg.id}
          style={{
            marginBottom: '10px',
            padding: '12px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            animation: 'slideIn 0.3s ease-out',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minWidth: '280px',
            ...(msg.type === 'success' && {
              background: '#10b981',
              color: '#fff'
            }),
            ...(msg.type === 'error' && {
              background: '#ef4444',
              color: '#fff'
            }),
            ...(msg.type === 'info' && {
              background: '#3b82f6',
              color: '#fff'
            })
          }}
          onClick={() => onRemove(msg.id)}
        >
          <span>
            {msg.type === 'success' && '✅'}
            {msg.type === 'error' && '❌'}
            {msg.type === 'info' && 'ℹ️'}
          </span>
          <span>{msg.message}</span>
        </div>
      ))}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
