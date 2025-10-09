/**
 * Hook para detectar se é mobile
 * Utilizando media queries e detecção de touch
 */

import { useState, useEffect } from 'react';

/**
 * Configurações do hook
 */
interface UseMobileOptions {
  /** Breakpoint para considerar mobile (em pixels) */
  breakpoint?: number;
  /** Se deve considerar apenas largura da tela */
  widthOnly?: boolean;
  /** Se deve considerar capacidade de touch */
  includeTouch?: boolean;
}

/**
 * Hook para detectar dispositivos móveis - versão básica mantida para compatibilidade
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < breakpoint);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}

/**
 * Hook avançado para detectar dispositivos móveis
 */
export function useIsMobileAdvanced(options: UseMobileOptions = {}): boolean {
  const {
    breakpoint = 768, // md breakpoint do Tailwind
    widthOnly = false,
    includeTouch = true
  } = options;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      let mobile = false;

      // Verifica largura da tela
      if (window.innerWidth < breakpoint) {
        mobile = true;
      }

      // Se não é apenas largura, verifica outras características
      if (!widthOnly && !mobile) {
        // Verifica se tem capacidade de touch
        if (includeTouch && 'ontouchstart' in window) {
          mobile = true;
        }

        // Verifica user agent para dispositivos móveis conhecidos
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = [
          'android', 'iphone', 'ipad', 'ipod', 
          'blackberry', 'windows phone', 'mobile'
        ];
        
        if (mobileKeywords.some(keyword => userAgent.includes(keyword))) {
          mobile = true;
        }
      }

      setIsMobile(mobile);
    };

    // Verifica inicialmente
    checkMobile();

    // Adiciona listener para mudanças de tamanho
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint, widthOnly, includeTouch]);

  return isMobile;
}

/**
 * Hook mais específico para diferentes breakpoints
 */
interface UseResponsiveResult {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
  isExtraLarge: boolean;
  screenWidth: number;
}

export function useResponsive(): UseResponsiveResult {
  const [screenWidth, setScreenWidth] = useState(0);

  useEffect(() => {
    const updateScreenWidth = () => {
      setScreenWidth(window.innerWidth);
    };

    // Set initial width
    updateScreenWidth();

    window.addEventListener('resize', updateScreenWidth);
    return () => window.removeEventListener('resize', updateScreenWidth);
  }, []);

  return {
    screenWidth,
    isSmall: screenWidth < 640,       // sm
    isMobile: screenWidth < 768,      // md
    isTablet: screenWidth >= 768 && screenWidth < 1024, // md to lg
    isMedium: screenWidth >= 768,     // md+
    isLarge: screenWidth >= 1024,     // lg+
    isDesktop: screenWidth >= 1024,   // lg+
    isExtraLarge: screenWidth >= 1280 // xl+
  };
}

/**
 * Hook para detectar orientação do dispositivo
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);

  return orientation;
}

/**
 * Hook combinado para todas as informações do dispositivo
 */
export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  screenWidth: number;
  screenHeight: number;
}

export function useDeviceInfo(): DeviceInfo {
  const { isMobile, isTablet, isDesktop, screenWidth } = useResponsive();
  const orientation = useOrientation();
  const [screenHeight, setScreenHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => setScreenHeight(window.innerHeight);
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop,
    orientation,
    screenWidth,
    screenHeight
  };
}
