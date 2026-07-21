import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  action 
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.5rem',
      textAlign: 'center',
      background: 'rgba(26, 26, 26, 0.25)',
      border: '1px dashed var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      width: '100%',
      maxWidth: '500px',
      margin: '2rem auto'
    }}>
      <div style={{
        background: 'rgba(212, 175, 55, 0.05)',
        border: '1px solid rgba(212, 175, 55, 0.2)',
        borderRadius: 'var(--radius-full)',
        padding: '1rem',
        marginBottom: '1rem',
        color: 'var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={32} />
      </div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{title}</h3>
      {description && (
        <p style={{ 
          fontSize: '0.875rem', 
          color: 'var(--text-secondary)', 
          maxWidth: '300px', 
          lineHeight: '1.4',
          marginBottom: '1.25rem' 
        }}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};
