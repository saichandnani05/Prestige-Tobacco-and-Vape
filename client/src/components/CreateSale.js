import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './CreateSale.css';

const CreateSale = ({ onSaleCreated, onClose }) => {
  const { user } = useAuth();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    inventory_item_id: '',
    quantity_sold: 1,
    unit_price: '',
    customer_name: '',
    payment_method: 'cash',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    product_name: '',
    category: 'Vape',
    brand: '',
    quantity: '',
    unit_price: '',
    sku: '',
    description: ''
  });
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchInventoryItems();
  }, []);

  // Auto-populate unit_price when item is selected
  useEffect(() => {
    if (selectedItem) {
      const defaultPrice = selectedItem.unit_price || 29.99;
      // Only update if unit_price is empty or invalid
      if (!formData.unit_price || parseFloat(formData.unit_price) <= 0 || isNaN(parseFloat(formData.unit_price))) {
        setFormData(prev => ({
          ...prev,
          unit_price: defaultPrice
        }));
      }
    }
  }, [selectedItem]);

  useEffect(() => {
    if (formData.inventory_item_id) {
      const itemId = parseInt(formData.inventory_item_id);
      const item = inventoryItems.find(i => i.id === itemId);
      
      if (item) {
        // Only update if the item is different from current selection
        if (!selectedItem || selectedItem.id !== item.id) {
          // Default unit_price to 29.99 if missing
          const defaultPrice = item.unit_price || 29.99;
          setSelectedItem({ ...item, unit_price: defaultPrice });
          setFormData(prev => ({
            ...prev,
            inventory_item_id: item.id, // Keep as number
            unit_price: defaultPrice // Use default price if missing
          }));
          setSearchTerm(item.product_name);
          setShowDropdown(false);
        }
      } else if (selectedItem && selectedItem.id === itemId) {
        // Item was selected but not in current inventory list - keep it selected
        // This handles the case where a product was just created
        console.log('Selected item not in inventory list, but keeping selection:', selectedItem);
        // Ensure unit_price is set even if item is not in list
        if (!selectedItem.unit_price || selectedItem.unit_price === '') {
          const updatedItem = { ...selectedItem, unit_price: 29.99 };
          setSelectedItem(updatedItem);
          setFormData(prev => ({
            ...prev,
            unit_price: 29.99
          }));
        }
      }
    }
  }, [formData.inventory_item_id, inventoryItems]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is inside dropdown or input - check all possible targets
      const clickedInsideDropdown = dropdownRef.current && (
        dropdownRef.current.contains(event.target) ||
        dropdownRef.current.contains(event.target.closest('.autocomplete-dropdown'))
      );
      const clickedInsideInput = inputRef.current && inputRef.current.contains(event.target);
      
      // Only close if clicking outside both dropdown and input
      if (!clickedInsideDropdown && !clickedInsideInput) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      // Use 'click' event (not mousedown) and normal bubbling phase (not capture)
      // This allows item clicks to fire first and stop propagation
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [showDropdown]);

  const fetchInventoryItems = async () => {
    setLoadingInventory(true);
    // Don't clear error here - preserve success/error messages
    
    try {
      // Fetch all approved items and pending items (for newly created ones)
      const response = await axios.get('/api/inventory');
      
      // Check if response data is valid
      if (!response.data || !Array.isArray(response.data)) {
        console.error('Invalid response format:', response.data);
        setInventoryItems([]);
        setLoadingInventory(false);
        return [];
      }
      
      // Filter to show approved items and items with quantity > 0
      const validItems = response.data.filter(item => 
        item && 
        (item.status === 'approved' || item.status === 'pending') && 
        (item.quantity !== null && item.quantity !== undefined && item.quantity > 0)
      );
      
      setInventoryItems(validItems);
      setLoadingInventory(false);
      return validItems; // Return the items for use after the call
    } catch (error) {
      console.error('Error fetching inventory:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load inventory items';
      
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 401 || error.response.status === 403) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = `Failed to load inventory: ${error.response.data?.error || error.response.statusText}`;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Network error. Please check your connection and ensure the server is running.';
      } else {
        // Something else happened
        errorMessage = `Error: ${error.message || 'Unknown error'}`;
      }
      
      // Only set error if it's not a success message
      if (!errorMessage.includes('✅')) {
        setError(errorMessage);
      }
      // Set empty array to prevent further errors
      setInventoryItems([]);
      setLoadingInventory(false);
      return []; // Return empty array on error
    }
  };

  // Helper function to clear error after delay
  const clearErrorAfterDelay = (message, delay = 5000) => {
    if (message && message.includes('Please try creating the sale again')) {
      setTimeout(() => {
        setError(prev => prev === message ? '' : prev);
      }, delay);
    }
  };

  // Calculate filtered items using useMemo
  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item =>
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10); // Limit to 10 results for better UX
  }, [inventoryItems, searchTerm]);

  useEffect(() => {
    // Don't auto-open dropdown if an item is already selected (user just selected from dropdown)
    if (selectedItem) {
      return; // Keep dropdown closed when item is selected
    }
    
    if (searchTerm && (filteredItems.length > 0 || searchTerm.length > 0)) {
      setShowDropdown(true);
      setHighlightedIndex(0);
    } else if (!searchTerm) {
      setShowDropdown(false);
    }
  }, [searchTerm, filteredItems.length, selectedItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear any previous errors
    setLoading(true);
    
    // Validate that we have a selected item first
    if (!selectedItem || !selectedItem.id) {
      setError('Please select a product before creating a sale.');
      setLoading(false);
      return;
    }

    // Prepare sale data outside try block so it's accessible in catch
    let saleData = null;
    
    try {
      // Use selectedItem.id as the source of truth - ensure it's a number
      // Also check formData.inventory_item_id as fallback
      const itemId = parseInt(selectedItem.id) || parseInt(formData.inventory_item_id);
      
      if (!itemId || isNaN(itemId) || itemId <= 0) {
        setError('Invalid product ID. Please select a product again.');
        setLoading(false);
        return;
      }

      // Validate quantity
      const quantity = parseInt(formData.quantity_sold) || 1;
      if (quantity < 1) {
        setError('Please enter a valid quantity (at least 1).');
        setLoading(false);
        return;
      }

      // Check quantity availability
      if (selectedItem.quantity < quantity) {
        setError(`Insufficient quantity. Available: ${selectedItem.quantity}, Requested: ${quantity}`);
        setLoading(false);
        return;
      }

      // Validate and set unit price - default to 29.99 if missing
      let unitPrice = parseFloat(formData.unit_price);
      if (!unitPrice || unitPrice <= 0 || isNaN(unitPrice)) {
        // Try to get price from selected item
        unitPrice = parseFloat(selectedItem.unit_price) || 29.99;
        // Update form data with the default price for display
        setFormData(prev => ({ ...prev, unit_price: unitPrice }));
      }

      // Prepare data with correct types - ensure all values are properly formatted
      // Use selectedItem.id as the source of truth, ensuring it's a number
      // Try multiple ways to get the ID to ensure we have a valid number
      let finalItemId;
      
      // Priority 1: Use selectedItem.id (most reliable)
      if (selectedItem && selectedItem.id !== undefined && selectedItem.id !== null) {
        // Try direct parseInt first
        finalItemId = parseInt(selectedItem.id);
        
        // If that fails, try extracting number from string
        if (isNaN(finalItemId)) {
          const numMatch = String(selectedItem.id).match(/\d+/);
          if (numMatch) {
            finalItemId = parseInt(numMatch[0]);
          }
        }
        
        // If still NaN, try Number() conversion
        if (isNaN(finalItemId)) {
          finalItemId = Number(selectedItem.id);
        }
      } 
      // Priority 2: Fallback to formData
      else if (formData.inventory_item_id) {
        finalItemId = parseInt(formData.inventory_item_id);
        if (isNaN(finalItemId)) {
          finalItemId = Number(formData.inventory_item_id);
        }
      }
      
      const finalUnitPrice = parseFloat(unitPrice);
      
      // Final validation before sending
      if (!finalItemId || isNaN(finalItemId) || finalItemId <= 0) {
        console.error('❌ Invalid product ID:', {
          selectedItemId: selectedItem?.id,
          selectedItemIdType: typeof selectedItem?.id,
          formDataInventoryItemId: formData.inventory_item_id,
          finalItemId: finalItemId,
          selectedItem: selectedItem,
          inventoryItems: inventoryItems.slice(0, 5).map(i => ({ id: i.id, name: i.product_name }))
        });
        setError('Invalid product ID. Please select a product again.');
        setLoading(false);
        return;
      }
      
      if (isNaN(finalUnitPrice) || finalUnitPrice <= 0) {
        setError('Invalid unit price. Please enter a valid price.');
        setLoading(false);
        return;
      }
      
      saleData = {
        inventory_item_id: finalItemId, // Ensure it's an integer
        quantity_sold: quantity,
        unit_price: finalUnitPrice, // Already validated and defaulted
        customer_name: formData.customer_name?.trim() || null,
        payment_method: formData.payment_method || 'cash',
        notes: formData.notes?.trim() || null
      };

      console.log('📤 Submitting sale:', saleData); // Debug log
      console.log('📦 Selected item:', selectedItem); // Debug log
      console.log('🆔 Item ID being sent:', finalItemId, 'Type:', typeof finalItemId); // Debug log
      console.log('🆔 Selected item ID:', selectedItem.id, 'Type:', typeof selectedItem.id); // Debug log
      console.log('💰 Unit price being sent:', finalUnitPrice, 'Type:', typeof finalUnitPrice); // Debug log

      const response = await axios.post('/api/sales', saleData);
      
      // Show success message
      const successMessage = `✅ Sale created successfully! ${quantity} × $${unitPrice.toFixed(2)} = $${(quantity * unitPrice).toFixed(2)}`;
      setError(successMessage);
      
      // Refresh inventory to get updated quantities
      await fetchInventoryItems();
      
      // Clear selection and reset form after successful sale
      // This allows user to start fresh for the next sale
      setSelectedItem(null);
      setFormData({
        inventory_item_id: '',
        quantity_sold: 1,
        unit_price: '',
        customer_name: '',
        payment_method: 'cash',
        notes: ''
      });
      setSearchTerm('');
      
      setShowAddProduct(false);
      setLoading(false); // Ensure loading is set to false after success
      
      // Clear success message after 2 seconds (reduced from 3)
      setTimeout(() => {
        setError(prev => prev === successMessage ? '' : prev);
      }, 2000);
      
      // Notify parent component about the sale
      // Wait a moment to ensure database transaction is committed
      if (onSaleCreated) {
        console.log('📞 Calling onSaleCreated callback with:', response.data);
        // Small delay to ensure DB transaction is complete
        setTimeout(() => {
          onSaleCreated(response.data);
        }, 100);
      }
      
      // Close the modal automatically after successful sale creation
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 500); // Small delay to show success message briefly
      }
    } catch (error) {
      console.error('Error creating sale:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        selectedItem: selectedItem,
        saleData: saleData
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create sale';
      
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 400) {
          errorMessage = error.response.data?.error || 'Invalid sale data. Please check your inputs.';
        } else if (error.response.status === 401 || error.response.status === 403) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (error.response.status === 404) {
          // Product not found - clear selection and show error
          const serverError = error.response.data?.error || 'Product not found in database.';
          errorMessage = `${serverError} Please select a product again.`;
          
          // Clear selection since product doesn't exist
          setSelectedItem(null);
          setFormData({
            inventory_item_id: '',
            quantity_sold: 1,
            unit_price: '',
            customer_name: '',
            payment_method: 'cash',
            notes: ''
          });
          setSearchTerm('');
          
          // Refresh inventory to get latest data
          try {
            await fetchInventoryItems();
          } catch (refreshError) {
            console.error('Error refreshing inventory:', refreshError);
          }
        } else if (error.response.status === 500) {
          errorMessage = error.response.data?.error || 'Server error. Please try again later.';
        } else {
          errorMessage = error.response.data?.error || `Error: ${error.response.statusText}`;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Network error. Please check your connection and ensure the server is running.';
      } else {
        // Something else happened
        errorMessage = `Error: ${error.message || 'Unknown error'}`;
      }
      
      // Set error message
      if (errorMessage && !errorMessage.includes('✅')) {
        setError(errorMessage);
      }
      
      // Auto-clear informational messages after 5 seconds
      if (errorMessage.includes('Please try creating the sale again')) {
        setTimeout(() => {
          setError(prev => prev === errorMessage ? '' : prev);
        }, 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate total amount - use form price, then selected item price, then default to 29.99
  // Always calculate even if no item selected (for preview)
  const quantity = parseFloat(formData.quantity_sold) || 1;
  const unitPriceForTotal = formData.unit_price 
    ? parseFloat(formData.unit_price) 
    : (selectedItem?.unit_price ? parseFloat(selectedItem.unit_price) : 29.99);
  const totalAmount = quantity * (unitPriceForTotal || 29.99);

  const handleSelectItem = (item, event) => {
    // Prevent event propagation to avoid conflicts with click outside handler
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent?.stopImmediatePropagation();
    }
    
    if (!item || !item.id) {
      console.error('Invalid item selected:', item);
      setError('Invalid product selected');
      return;
    }
    
    // Ensure ID is a number - try multiple conversion methods
    let itemId = parseInt(item.id);
    if (isNaN(itemId)) {
      // Try string conversion first
      itemId = parseInt(String(item.id));
      if (isNaN(itemId)) {
        // Try extracting numbers from string
        const numericMatch = String(item.id).match(/\d+/);
        if (numericMatch) {
          itemId = parseInt(numericMatch[0]);
        }
      }
    }
    
    if (isNaN(itemId) || itemId <= 0) {
      console.error('Invalid item ID after conversion:', item.id, 'Converted:', itemId);
      setError('Invalid product ID. Please try selecting again.');
      return;
    }
    
    // Update selected item and form data - ensure ID is always a number
    // Default unit_price to 29.99 if missing (since all prices should be 29.99)
    const defaultPrice = parseFloat(item.unit_price) || 29.99;
    const normalizedItem = { 
      ...item, 
      id: itemId, // Ensure ID is a number
      unit_price: defaultPrice // Ensure price is a number
    };
    
    // Close dropdown immediately to prevent double-click issues and auto-reopening
    setShowDropdown(false);
    
    // Set selected item first, then update form data and search term
    // This ensures the useEffect won't reopen the dropdown
    setSelectedItem(normalizedItem);
    setFormData(prev => ({
      ...prev,
      inventory_item_id: itemId, // Store as number
      unit_price: defaultPrice // Use default price if missing
    }));
    
    // Set search term after a small delay to ensure dropdown stays closed
    setTimeout(() => {
      setSearchTerm(item.product_name || '');
      // Blur input to ensure selection is complete
      inputRef.current?.blur();
    }, 100);
    
    console.log('Item selected - ID:', itemId, 'Type:', typeof itemId, 'Item:', normalizedItem); // Debug log
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) return;

    const totalOptions = filteredItems.length + (searchTerm ? 1 : 0); // Include "Add New" option

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < totalOptions - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex < filteredItems.length && filteredItems[highlightedIndex]) {
          handleSelectItem(filteredItems[highlightedIndex], e);
        } else if (highlightedIndex === filteredItems.length && searchTerm) {
          // "Add New Product" option
          setShowAddProduct(true);
          setShowDropdown(false);
          setNewProduct(prev => ({ ...prev, product_name: searchTerm }));
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setShowAddProduct(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedItem(null);
    setFormData(prev => ({
      ...prev,
      inventory_item_id: '',
      unit_price: ''
    }));
    if (value) {
      setNewProduct(prev => ({ ...prev, product_name: value }));
    }
  };

  const handleAddNewProduct = async () => {
    if (!newProduct.product_name || !newProduct.quantity) {
      setError('Product name and quantity are required');
      return;
    }

    setAddingProduct(true);
    setError('');

    try {
      // Create the product
      const productResponse = await axios.post('/api/inventory', {
        ...newProduct,
        quantity: parseInt(newProduct.quantity),
        unit_price: newProduct.unit_price ? parseFloat(newProduct.unit_price) : null
      });

      // If user is admin, auto-approve the product
      let approvedProduct = productResponse.data;

      // If status is pending and user is admin, approve it
      if (approvedProduct.status === 'pending' && user?.role === 'admin') {
        try {
          const approveResponse = await axios.post(`/api/inventory/${approvedProduct.id}/approve`);
          approvedProduct = approveResponse.data;
        } catch (approveErr) {
          // If approval fails, still use the product (it will be pending)
          console.warn('Could not auto-approve product:', approveErr);
        }
      }

      // Refresh inventory list
      await fetchInventoryItems();
      
      // Use the approved product directly - it has all the info we need
      // Ensure we have all required fields with correct types
      const productToSelect = {
        id: approvedProduct.id,
        product_name: approvedProduct.product_name || newProduct.product_name,
        brand: approvedProduct.brand || newProduct.brand || null,
        quantity: parseInt(newProduct.quantity),
        unit_price: approvedProduct.unit_price || (newProduct.unit_price ? parseFloat(newProduct.unit_price) : null),
        sku: approvedProduct.sku || newProduct.sku || null,
        status: approvedProduct.status || 'pending',
        category: approvedProduct.category || newProduct.category || 'Vape'
      };
      
      console.log('Selecting newly created product:', productToSelect); // Debug log
      
      // Auto-select the newly created product
      handleSelectItem(productToSelect, null);
      setShowAddProduct(false);
      setNewProduct({
        product_name: '',
        category: 'Vape',
        brand: '',
        quantity: '',
        unit_price: '',
        sku: '',
        description: ''
      });
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create product');
    } finally {
      setAddingProduct(false);
    }
  };

  return (
    <motion.div
      className="create-sale-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose && onClose()}
    >
      <motion.div
        className="create-sale-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="create-sale-header">
          <h2 style={{ color: '#ffffff' }}>Create New Sale</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="close-button"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="create-sale-form">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={error.includes('✅') ? 'alert alert-success' : 'alert alert-error'}
              style={{ 
                marginBottom: '20px',
                padding: '12px 16px',
                backgroundColor: error.includes('✅') 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : 'rgba(239, 68, 68, 0.1)',
                border: error.includes('✅')
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: error.includes('✅') ? '#10b981' : '#ef4444',
                fontSize: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{error.includes('✅') ? '✅' : '⚠️'}</span>
                <span>{error}</span>
                {!error.includes('✅') && (
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      fetchInventoryItems();
                    }}
                    style={{
                      marginLeft: 'auto',
                      padding: '4px 12px',
                      fontSize: '12px',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      borderRadius: '4px',
                      color: '#ef4444',
                      cursor: 'pointer'
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>
            </motion.div>
          )}

          <div className="form-group" ref={dropdownRef} style={{ position: 'relative' }}>
            <label>Search Product {loadingInventory && <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 'normal' }}>(Loading...)</span>}</label>
            <input
              ref={inputRef}
              type="text"
              placeholder={loadingInventory ? "Loading products..." : "Type to search products..."}
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={() => {
                if (searchTerm && filteredItems.length > 0 && !loadingInventory) {
                  setShowDropdown(true);
                }
              }}
              onKeyDown={handleKeyDown}
              required
              disabled={loadingInventory}
              style={{ marginBottom: '0', opacity: loadingInventory ? 0.6 : 1 }}
            />
            
            <AnimatePresence>
              {showDropdown && !loadingInventory && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="autocomplete-dropdown"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#1a1a1a',
                    border: '2px solid #dc143c',
                    borderRadius: '8px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3), 0 0 30px rgba(220, 20, 60, 0.3)',
                    zIndex: 1000,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    overflowX: 'hidden'
                  }}
                >
                  {filteredItems.length > 0 && filteredItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Stop immediate propagation to prevent document click handler from firing
                        if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
                          e.nativeEvent.stopImmediatePropagation();
                        }
                        handleSelectItem(item, e);
                      }}
                      onMouseDown={(e) => {
                        // Prevent default to avoid text selection and focus issues
                        e.preventDefault();
                      }}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#ffffff',
                        backgroundColor: highlightedIndex === index 
                          ? 'rgba(220, 20, 60, 0.3)' 
                          : selectedItem?.id === item.id 
                            ? 'rgba(220, 20, 60, 0.2)' 
                            : 'transparent',
                        borderLeft: highlightedIndex === index || selectedItem?.id === item.id
                          ? '3px solid #dc143c'
                          : '3px solid transparent',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      whileHover={{
                        backgroundColor: 'rgba(220, 20, 60, 0.2)',
                        transition: { duration: 0.2 }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#ffffff' }}>
                          {item.product_name}
                        </span>
                        {item.unit_price && (
                          <span style={{ color: '#10b981', fontWeight: 600, fontSize: '14px' }}>
                            ${parseFloat(item.unit_price).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                        {item.brand && <span>{item.brand}</span>}
                        <span>Qty: {item.quantity}</span>
                        {item.sku && <span>SKU: {item.sku}</span>}
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Add New Product Option */}
                  {searchTerm && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: filteredItems.length * 0.02 }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowAddProduct(true);
                        setShowDropdown(false);
                        setNewProduct(prev => ({ ...prev, product_name: searchTerm }));
                      }}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#ffffff',
                        backgroundColor: highlightedIndex === filteredItems.length
                          ? 'rgba(59, 130, 246, 0.3)'
                          : 'transparent',
                        borderLeft: highlightedIndex === filteredItems.length
                          ? '3px solid #3b82f6'
                          : '3px solid transparent',
                        borderTop: filteredItems.length > 0 ? '1px solid #333' : 'none',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                      onMouseEnter={() => setHighlightedIndex(filteredItems.length)}
                      whileHover={{
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        transition: { duration: 0.2 }
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>➕</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#3b82f6' }}>
                          Add New Product: "{searchTerm}"
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          Create and add to inventory
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {selectedItem && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '6px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: '13px',
                  color: '#e5e5e5'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#10b981' }}>✓ Selected:</strong> {selectedItem.product_name}
                    {selectedItem.brand && <span style={{ color: '#64748b', marginLeft: '8px' }}>({selectedItem.brand})</span>}
                  </div>
                  <div style={{ color: '#10b981', fontWeight: 600 }}>
                    Available: {selectedItem.quantity} units
                  </div>
                </div>
              </motion.div>
            )}

            {searchTerm && !selectedItem && filteredItems.length === 0 && !showAddProduct && (
              <div style={{
                marginTop: '8px',
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                fontSize: '13px',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
              onClick={() => {
                setShowAddProduct(true);
                setNewProduct(prev => ({ ...prev, product_name: searchTerm }));
              }}
              >
                <span>➕</span>
                <span>Click to add "{searchTerm}" as a new product</span>
              </div>
            )}

            {/* Add New Product Form */}
            {showAddProduct && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  marginTop: '16px',
                  padding: '20px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '8px',
                  border: '2px solid #3b82f6'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ color: '#3b82f6', margin: 0, fontSize: '16px' }}>➕ Add New Product</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddProduct(false);
                      setNewProduct({
                        product_name: '',
                        category: 'Vape',
                        brand: '',
                        quantity: '',
                        unit_price: '',
                        sku: '',
                        description: ''
                      });
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '20px',
                      padding: '0',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>Product Name *</label>
                    <input
                      type="text"
                      value={newProduct.product_name}
                      onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
                      placeholder="Product name"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>Brand</label>
                    <input
                      type="text"
                      value={newProduct.brand}
                      onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                      placeholder="Brand name"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={newProduct.quantity}
                      onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>Unit Price</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newProduct.unit_price}
                      onChange={(e) => setNewProduct({ ...newProduct, unit_price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>SKU</label>
                    <input
                      type="text"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                      placeholder="SKU"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px' }}>Description</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Product description"
                    rows="2"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddNewProduct}
                  disabled={addingProduct || !newProduct.product_name || !newProduct.quantity}
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: '14px', padding: '10px' }}
                >
                  {addingProduct ? 'Creating...' : 'Create Product & Continue'}
                </button>
              </motion.div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Quantity {selectedItem && <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 'normal' }}>(Max: {selectedItem.quantity})</span>}</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    const currentQty = parseInt(formData.quantity_sold) || 1;
                    const newQty = Math.max(1, currentQty - 1);
                    setFormData({ ...formData, quantity_sold: newQty });
                  }}
                  disabled={!selectedItem || (parseInt(formData.quantity_sold) || 1) <= 1}
                  style={{
                    position: 'absolute',
                    left: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: (!selectedItem || (parseInt(formData.quantity_sold) || 1) <= 1) ? 'not-allowed' : 'pointer',
                    opacity: (!selectedItem || (parseInt(formData.quantity_sold) || 1) <= 1) ? 0.3 : 1,
                    padding: '4px 8px',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!(!selectedItem || (parseInt(formData.quantity_sold) || 1) <= 1)) {
                      e.target.style.backgroundColor = 'rgba(220, 20, 60, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max={selectedItem?.quantity || 999}
                  value={formData.quantity_sold}
                  onChange={(e) => {
                    const qty = parseInt(e.target.value) || 1;
                    const maxQty = selectedItem?.quantity || 999;
                    setFormData({ ...formData, quantity_sold: Math.min(Math.max(1, qty), maxQty) });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const currentQty = parseInt(formData.quantity_sold) || 1;
                      const maxQty = selectedItem?.quantity || 999;
                      const newQty = Math.min(currentQty + 1, maxQty);
                      setFormData({ ...formData, quantity_sold: newQty });
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const currentQty = parseInt(formData.quantity_sold) || 1;
                      const newQty = Math.max(1, currentQty - 1);
                      setFormData({ ...formData, quantity_sold: newQty });
                    }
                  }}
                  required
                  disabled={!selectedItem}
                  style={{
                    paddingLeft: '40px',
                    paddingRight: '40px',
                    textAlign: 'center',
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const currentQty = parseInt(formData.quantity_sold) || 1;
                    const maxQty = selectedItem?.quantity || 999;
                    const newQty = Math.min(currentQty + 1, maxQty);
                    setFormData({ ...formData, quantity_sold: newQty });
                  }}
                  disabled={!selectedItem || (parseInt(formData.quantity_sold) || 1) >= (selectedItem?.quantity || 999)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: (!selectedItem || (parseInt(formData.quantity_sold) || 1) >= (selectedItem?.quantity || 999)) ? 'not-allowed' : 'pointer',
                    opacity: (!selectedItem || (parseInt(formData.quantity_sold) || 1) >= (selectedItem?.quantity || 999)) ? 0.3 : 1,
                    padding: '4px 8px',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!(!selectedItem || (parseInt(formData.quantity_sold) || 1) >= (selectedItem?.quantity || 999))) {
                      e.target.style.backgroundColor = 'rgba(220, 20, 60, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  +
                </button>
              </div>
              {selectedItem && formData.quantity_sold > selectedItem.quantity && (
                <small style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  ⚠️ Quantity exceeds available stock ({selectedItem.quantity} available)
                </small>
              )}
              {selectedItem && selectedItem.quantity === 0 && (
                <small style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  ⚠️ This item is out of stock
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Unit Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_price || ''}
                onChange={(e) => {
                  const price = e.target.value;
                  setFormData({ ...formData, unit_price: price });
                }}
                placeholder={selectedItem?.unit_price ? `Default: $${parseFloat(selectedItem.unit_price || 29.99).toFixed(2)}` : '29.99'}
                required
                disabled={!selectedItem}
              />
              {selectedItem && (
                <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  {formData.unit_price 
                    ? `Current: $${parseFloat(formData.unit_price).toFixed(2)}` 
                    : `Default: $${parseFloat(selectedItem.unit_price || 29.99).toFixed(2)}`}
                </small>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Total Amount</label>
            <input
              type="text"
              value={`$${totalAmount.toFixed(2)}`}
              disabled
              style={{ 
                backgroundColor: '#2a2a2a', 
                color: totalAmount > 0 ? '#10b981' : '#64748b', 
                fontWeight: 600,
                fontSize: '16px'
              }}
            />
            {(formData.quantity_sold || formData.unit_price) && (
              <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                {quantity} × ${unitPriceForTotal.toFixed(2)} = ${totalAmount.toFixed(2)}
              </small>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Customer Name (Optional)</label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Payment Method</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, payment_method: 'cash' })}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: `2px solid ${formData.payment_method === 'cash' ? '#dc143c' : '#333'}`,
                    backgroundColor: formData.payment_method === 'cash' ? '#dc143c' : '#1a1a1a',
                    color: formData.payment_method === 'cash' ? '#ffffff' : '#e5e5e5',
                    fontSize: '15px',
                    fontWeight: formData.payment_method === 'cash' ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit'
                  }}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, payment_method: 'card' })}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: `2px solid ${formData.payment_method === 'card' ? '#dc143c' : '#333'}`,
                    backgroundColor: formData.payment_method === 'card' ? '#dc143c' : '#1a1a1a',
                    color: formData.payment_method === 'card' ? '#ffffff' : '#e5e5e5',
                    fontSize: '15px',
                    fontWeight: formData.payment_method === 'card' ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit'
                  }}
                >
                  Card
                </button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !selectedItem || loadingInventory || (selectedItem && selectedItem.quantity < 1)}
              style={{
                opacity: (loading || !selectedItem || loadingInventory || (selectedItem && selectedItem.quantity < 1)) ? 0.5 : 1,
                cursor: (loading || !selectedItem || loadingInventory || (selectedItem && selectedItem.quantity < 1)) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Processing...' : selectedItem && selectedItem.quantity < 1 ? 'Out of Stock' : 'Create Sale'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default CreateSale;




