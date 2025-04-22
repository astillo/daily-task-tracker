import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastTapRef = useRef<number>(0);
  const [scale, setScale] = useState(1);
  const imageRef = useRef<HTMLImageElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle image loading
  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => setIsLoading(false);
    img.onerror = () => {
      console.error('Failed to load image');
      setIsLoading(false);
    };
  }, [imageUrl]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Add specific handling for iOS
  useEffect(() => {
    const preventTouchMove = (e: TouchEvent) => {
      // Allow touch move on the image when zoomed
      if (isZoomed && e.target && (e.target as HTMLElement).tagName === 'IMG') {
        return;
      }
      e.preventDefault();
    };

    const modal = modalRef.current;
    if (modal) {
      modal.addEventListener('touchmove', preventTouchMove, { passive: false });
    }

    return () => {
      if (modal) {
        modal.removeEventListener('touchmove', preventTouchMove);
      }
    };
  }, [isZoomed]);

  const handleClick = (e: React.MouseEvent) => {
    // Handle double-tap for zooming (especially for touch devices)
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // ms
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      toggleZoom();
      e.preventDefault();
    }
    
    lastTapRef.current = now;
  };

  const toggleZoom = () => {
    // If currently not zoomed, zoom to 2.5x at the tap position
    if (!isZoomed) {
      setScale(2.5);
      setIsZoomed(true);
    } else {
      // If already zoomed, reset
      setScale(1);
      setIsZoomed(false);
    }
  };

  const handleZoomIn = () => {
    const newScale = Math.min(scale + 0.5, 4);
    setScale(newScale);
    if (newScale > 1 && !isZoomed) {
      setIsZoomed(true);
    }
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.5, 1);
    setScale(newScale);
    if (newScale === 1 && isZoomed) {
      setIsZoomed(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent default only when zoomed to allow normal scroll when not zoomed
    if (isZoomed) {
      e.preventDefault();
    }
  };

  // Close modal when clicking outside the image
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  // Portal to render modal outside the normal DOM hierarchy
  return createPortal(
    <div 
      className="image-modal-overlay" 
      ref={modalRef}
      onClick={handleBackdropClick}
    >
      <div className="image-modal-content">
        <button
          className="image-modal-close"
          onClick={onClose}
          aria-label="Close image"
        >
          ✕
        </button>
        
        <div className="image-modal-body">
          {isLoading ? (
            <div className="loading-spinner">Loading...</div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: 1,
                scale: scale,
              }}
              transition={{ 
                opacity: { duration: 0.3 },
                scale: { type: "spring", stiffness: 300, damping: 30 }
              }}
              style={{ 
                width: "100%", 
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Full size"
                onClick={handleClick}
                onTouchStart={handleTouchStart}
                style={{ 
                  touchAction: isZoomed ? "none" : "auto",
                  transformOrigin: "center",
                  userSelect: "none"
                }}
                draggable="false"
              />
            </motion.div>
          )}
        </div>
        
        <div className="image-modal-zoom-controls">
          <button
            className="zoom-button"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            aria-label="Zoom out"
          >
            -
          </button>
          <button
            className="zoom-button"
            onClick={handleZoomIn}
            disabled={scale >= 4}
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImageModal; 