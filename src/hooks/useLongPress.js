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

  const start = useCallback(
    (event) => {
      // Store target for later cleanup
      if (event.target) {
        event.target.style.webkitUserSelect = 'none';
        event.target.style.userSelect = 'none';
        target.current = event.target;
      }

      if (onStart) {
        onStart(event);
      }

      timeout.current = setTimeout(() => {
        if (onLongPress) {
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
      // Cancel long press if finger moves too much
      const touch = e.touches[0];
      if (touch && target.current) {
        const rect = target.current.getBoundingClientRect();
        const x = touch.clientX;
        const y = touch.clientY;

        // If finger moves outside the element, cancel
        if (
          x < rect.left ||
          x > rect.right ||
          y < rect.top ||
          y > rect.bottom
        ) {
          clear(e, false);
        }
      }
    },
  };
};

export default useLongPress;
