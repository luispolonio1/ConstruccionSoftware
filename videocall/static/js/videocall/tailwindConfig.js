tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            'sf': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif']
          },
          colors: {
            'primary': '#F54927',
            'secondary': '#053470'
          },
          animation: {
            'pulse-dot': 'pulse-dot 2s infinite',
            'mic-pulse': 'mic-pulse 1.5s infinite',
            'fade-in': 'fade-in 0.8s ease-out',
            'slide-up': 'slide-up 1s ease-out 0.2s both',
            'speaking-pulse': 'speaking-pulse 2s infinite',
            'float': 'float 6s ease-in-out infinite'
          },
          keyframes: {
            'pulse-dot': {
              '0%, 100%': { opacity: '0.4' },
              '50%': { opacity: '1' }
            },
            'mic-pulse': {
              '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
              '50%': { transform: 'scale(1.3)', opacity: '0.5' }
            },
            'fade-in': {
              'from': { opacity: '0', transform: 'scale(0.98)' },
              'to': { opacity: '1', transform: 'scale(1)' }
            },
            'slide-up': {
              'from': { opacity: '0', transform: 'translateX(-50%) translateY(10px)' },
              'to': { opacity: '1', transform: 'translateX(-50%) translateY(0)' }
            },
            'speaking-pulse': {
              '0%, 100%': { opacity: '0', transform: 'scale(1)' },
              '50%': { opacity: '1', transform: 'scale(1.02)' }
            },
            'float': {
              '0%': { transform: 'translateY(0px)' },
              '50%': { transform: 'translateY(-15px)' },
              '100%': { transform: 'translateY(0px)' }
            }
          }
        }
      }
    }