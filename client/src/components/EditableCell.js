import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const EditableCell = ({ 
  value, 
  onSave, 
  type = 'text', 
  min, 
  step,
  disabled = false,
  className = '',
  style = {}
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const handleBlur = async () => {
    if (editValue !== value) {
      setSaving(true);
      try {
        await onSave(editValue);
      } catch (error) {
        console.error('Error saving:', error);
        setEditValue(value); // Revert on error
      } finally {
        setSaving(false);
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const formatDisplayValue = (val) => {
    if (type === 'number' && val !== null && val !== undefined && val !== '') {
      const numVal = parseFloat(val);
      if (!isNaN(numVal)) {
        if (step === 0.01 || step === '0.01') {
          return `$${numVal.toFixed(2)}`;
        }
        return numVal.toString();
      }
    }
    return val || '-';
  };

  if (disabled) {
    return (
      <span className={className} style={style}>
        {formatDisplayValue(value)}
      </span>
    );
  }

  if (isEditing) {
    return (
      <motion.input
        ref={inputRef}
        type={type}
        value={editValue || ''}
        onChange={(e) => {
          if (type === 'number') {
            const inputValue = e.target.value;
            if (inputValue === '') {
              setEditValue('');
            } else {
              const numValue = parseFloat(inputValue);
              if (!isNaN(numValue)) {
                setEditValue(numValue);
              }
            }
          } else {
            setEditValue(e.target.value);
          }
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        min={min}
        step={step}
        className={className}
        style={{
          ...style,
          padding: '4px 8px',
          border: '2px solid #dc143c',
          borderRadius: '4px',
          fontSize: 'inherit',
          fontFamily: 'inherit',
          width: '100%',
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          outline: 'none',
          boxShadow: '0 0 0 3px rgba(220, 20, 60, 0.2), 0 0 15px rgba(220, 20, 60, 0.1)'
        }}
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.1 }}
      />
    );
  }

  return (
    <motion.span
      onClick={handleClick}
      className={className}
      style={{
        ...style,
        cursor: 'pointer',
        padding: '4px 8px',
        borderRadius: '4px',
        display: 'inline-block',
        minWidth: '60px',
        position: 'relative',
        userSelect: 'none'
      }}
      whileHover={{ 
        backgroundColor: 'rgba(220, 20, 60, 0.1)',
        transition: { duration: 0.2 }
      }}
      title="Click to edit"
    >
      {saving ? (
        <span style={{ color: '#e5e5e5', fontStyle: 'italic' }}>Saving...</span>
      ) : (
        <>
          {formatDisplayValue(value)}
          <span style={{ 
            marginLeft: '6px', 
            opacity: 0.4, 
            fontSize: '0.85em',
            color: '#e5e5e5'
          }}>
            ✏️
          </span>
        </>
      )}
    </motion.span>
  );
};

export default EditableCell;






