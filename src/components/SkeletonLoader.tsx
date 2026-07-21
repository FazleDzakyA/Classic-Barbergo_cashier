import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = '1rem', 
  borderRadius = 'var(--radius-sm)', 
  style 
}) => {
  return (
    <div 
      className="skeleton" 
      style={{ width, height, borderRadius, ...style }} 
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <Skeleton width="40%" height="0.8rem" />
      <Skeleton width="70%" height="1.8rem" />
      <Skeleton width="50%" height="0.8rem" />
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} style={{ display: 'flex', gap: '1rem', width: '100%' }}>
          {Array.from({ length: cols }).map((_, cIdx) => (
            <Skeleton key={cIdx} height="2rem" style={{ flex: 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
};
