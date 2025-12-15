import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AnimatedDropdown = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  style = {},
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        document.addEventListener('mousedown', handleClickOutside);
      });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => 
    (typeof opt === 'object' ? opt.value : opt) === value
  ) || (typeof options[0] === 'object' ? options[0] : { value: options[0], label: options[0] });

  const displayValue = typeof selectedOption === 'object' 
    ? selectedOption.label || selectedOption.value 
    : selectedOption;

  const handleSelect = (optionValue) => {
    onChange({ target: { value: optionValue } });
    setIsOpen(false);
  };

  return (
    <div 
      ref={dropdownRef}
      style={{ 
        position: 'relative', 
        width: '100%',
        display: 'inline-block',
        ...style 
      }}
      className={className}
    >
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: '1px solid #333333',
          borderRadius: '8px',
          fontSize: '15px',
          fontFamily: 'Montserrat, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          backgroundColor: disabled ? '#1a1a1a' : '#1a1a1a',
          color: disabled ? '#666666' : '#ffffff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s',
          textAlign: 'left',
          position: 'relative'
        }}
        whileHover={!disabled ? { 
          borderColor: '#dc143c',
          backgroundColor: '#2a2a2a'
        } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
        animate={isOpen ? {
          borderColor: '#dc143c',
          boxShadow: '0 0 0 3px rgba(220, 20, 60, 0.2), 0 0 15px rgba(220, 20, 60, 0.1)'
        } : {}}
      >
        <span style={{ 
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1
        }}>
          {value ? displayValue : placeholder}
        </span>
        <motion.svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ marginLeft: '12px', flexShrink: 0 }}
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9998,
                backgroundColor: 'rgba(0, 0, 0, 0.1)'
              }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                width: '100%',
                minWidth: '140px',
                backgroundColor: '#1a1a1a',
                border: '2px solid #dc143c',
                borderRadius: '8px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3), 0 0 30px rgba(220, 20, 60, 0.3)',
                zIndex: 10000,
                maxHeight: '300px',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
              className="animated-dropdown-menu"
            >
            {options.map((option, index) => {
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' ? (option.label || option.value) : option;
              const isSelected = optionValue === value;

              return (
                <motion.div
                  key={optionValue}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ 
                    duration: 0.2,
                    delay: index * 0.02
                  }}
                  onClick={() => handleSelect(optionValue)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    color: '#ffffff',
                    backgroundColor: isSelected ? 'rgba(220, 20, 60, 0.2)' : 'transparent',
                    borderLeft: isSelected ? '3px solid #dc143c' : '3px solid transparent',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  whileHover={{
                    backgroundColor: isSelected ? 'rgba(220, 20, 60, 0.3)' : 'rgba(220, 20, 60, 0.1)',
                    transition: { duration: 0.2 }
                  }}
                >
                  <span style={{ fontWeight: isSelected ? 600 : 400 }}>
                    {optionLabel}
                  </span>
                  {isSelected && (
                    <motion.svg
                      width="16"
                      height="16"
                      viewBox="0 0 20 20"
                      fill="none"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <path
                        d="M16.667 5L7.5 14.167 3.333 10"
                        stroke="#dc143c"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </motion.svg>
                  )}
                </motion.div>
              );
            })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedDropdown;






