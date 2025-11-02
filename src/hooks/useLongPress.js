import { useCallback, useRef, useState } from 'react';

/**
 * Custom hook to detect long press events on touch devices
 * @param {Function} onLongPress - Callback function to execute on long press
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Duration in ms to trigger long press (default: 500ms)
 * @param {Function} options.onStart - Optional callback when press starts
 * @param {Function} options.onFinish - Optional callback when press finishes
 * @param {Function} options.onCancel - Optional callback when press is cancelled
 * @returns {Object} - Event handlers to spread on element
 */
export const useLongPress = (
  onLongPress,
  { threshold = 500, onStart, onFinish, onCancel } = {}
) => {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef();
  const target = useRef();
  const startPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const start = useCallback(
    (event) => {
      // Store target for later cleanup
      if (event.target) {
        event.target.style.webkitUserSelect = 'none';
        event.target.style.userSelect = 'none';
        target.current = event.target;
      }

      // Store initial touch position
      const touch = event.touches ? event.touches[0] : event;
      startPos.current = { x: touch.clientX, y: touch.clientY };
      hasMoved.current = false;

      if (onStart) {
        onStart(event);
      }

      timeout.current = setTimeout(() => {
        // Only trigger long press if user hasn't scrolled
        if (onLongPress && !hasMoved.current) {
          onLongPress(event);
          setLongPressTriggered(true);
        }
      }, threshold);
    },
    [onLongPress, threshold, onStart]
  );

  const clear = useCallback(
    (event, shouldTriggerFinish = true) => {
      timeout.current && clearTimeout(timeout.current);

      if (target.current) {
        target.current.style.webkitUserSelect = '';
        target.current.style.userSelect = '';
      }

      if (shouldTriggerFinish) {
        if (longPressTriggered) {
          if (onFinish) {
            onFinish(event);
          }
        } else {
          if (onCancel) {
            onCancel(event);
          }
        }
      }

      setLongPressTriggered(false);
    },
    [longPressTriggered, onFinish, onCancel]
  );

  return {
    onMouseDown: (e) => start(e),
    onTouchStart: (e) => start(e),
    onMouseUp: (e) => clear(e),
    onMouseLeave: (e) => clear(e, false),
    onTouchEnd: (e) => clear(e),
    onTouchMove: (e) => {
      // Detect if user is scrolling (moved more than 10px)
      const touch = e.touches[0];
      if (touch && startPos.current) {
        const deltaX = Math.abs(touch.clientX - startPos.current.x);
        const deltaY = Math.abs(touch.clientY - startPos.current.y);

        // If moved more than 10px in any direction, consider it scrolling
        if (deltaX > 10 || deltaY > 10) {
          hasMoved.current = true;
          clear(e, false);
        }
      }
    },
  };
};

export default useLongPress;
