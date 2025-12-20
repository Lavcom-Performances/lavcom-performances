// Analytics tracking utility
// Supports Google Analytics (gtag), custom events, and console logging for development

type EventParams = Record<string, string | number | boolean>;

interface TrackEventOptions {
  category: string;
  action: string;
  label?: string;
  value?: number;
  params?: EventParams;
}

// Check if Google Analytics is available
const hasGtag = (): boolean => {
  return typeof window !== 'undefined' && 'gtag' in window;
};

// Track a custom event
export const trackEvent = ({ category, action, label, value, params }: TrackEventOptions): void => {
  const eventData = {
    event_category: category,
    event_label: label,
    value: value,
    ...params,
  };

  // Log in development
  if (import.meta.env.DEV) {
    console.log('[Analytics]', { category, action, label, value, params });
  }

  // Send to Google Analytics if available
  if (hasGtag()) {
    (window as any).gtag('event', action, eventData);
  }

  // Store in localStorage for basic analytics (can be sent to backend later)
  try {
    const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    events.push({
      ...eventData,
      action,
      timestamp: new Date().toISOString(),
    });
    // Keep only last 100 events
    if (events.length > 100) {
      events.shift();
    }
    localStorage.setItem('analytics_events', JSON.stringify(events));
  } catch (e) {
    // Ignore storage errors
  }
};

// Track page views
export const trackPageView = (path: string, title?: string): void => {
  // Log in development
  if (import.meta.env.DEV) {
    console.log('[Analytics] Page View:', { path, title });
  }

  // Send to Google Analytics / GTM if available
  if (hasGtag()) {
    (window as any).gtag('config', 'GTM-TQP6TGS3', {
      page_path: path,
      page_title: title || document.title,
    });
  }

  // Also push to dataLayer for GTM
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: 'page_view',
      page_path: path,
      page_title: title || document.title,
    });
  }
};

// Predefined tracking functions for common events
export const trackEbookClick = (location: string): void => {
  trackEvent({
    category: 'Ebook',
    action: 'click_guide_ebook',
    label: location,
    params: {
      guide_name: 'Avant d\'ouvrir',
      click_location: location,
    },
  });
};

export const trackSimulatorStart = (): void => {
  trackEvent({
    category: 'Simulator',
    action: 'start_simulation',
  });
};

export const trackSimulatorComplete = (projectName?: string): void => {
  trackEvent({
    category: 'Simulator',
    action: 'complete_simulation',
    label: projectName,
  });
};

export const trackPdfDownload = (reportType: string): void => {
  trackEvent({
    category: 'Download',
    action: 'download_pdf',
    label: reportType,
  });
};

export const trackContactSubmit = (): void => {
  trackEvent({
    category: 'Contact',
    action: 'submit_contact_form',
  });
};

// Get stored events (for debugging or sending to backend)
export const getStoredEvents = (): any[] => {
  try {
    return JSON.parse(localStorage.getItem('analytics_events') || '[]');
  } catch {
    return [];
  }
};

// Clear stored events
export const clearStoredEvents = (): void => {
  localStorage.removeItem('analytics_events');
};
