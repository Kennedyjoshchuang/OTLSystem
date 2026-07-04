import React, { useState } from 'react';

export const ButtonWithLoading = ({ 
  onClick, 
  children, 
  className = '', 
  disabled = false, 
  loading: externalLoading,
  ...props 
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = !!(externalLoading || internalLoading);

  const handleClick = async (e) => {
    if (disabled || isLoading) return;
    setInternalLoading(true);
    try {
      if (onClick) {
        await onClick(e);
      }
    } catch (err) {
      console.error('Button action failed:', err);
      alert('Action failed: ' + (err.message || err));
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <button
      className={className}
      onClick={handleClick}
      disabled={disabled || isLoading}
      style={{
        opacity: disabled || isLoading ? 0.75 : 1,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        ...props.style,
        ...(disabled || isLoading ? { opacity: Math.max(0.75, parseFloat(props.style?.opacity || 0)) } : {})
      }}
      {...props}
    >
      {isLoading ? 'Processing…' : children}
    </button>
  );
};

