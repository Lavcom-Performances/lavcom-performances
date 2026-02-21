// src/lib/analytics.ts
// Analytics tracking utility
// Supports Google Analytics via GTM (GTM-TQP6TGS3) + dataLayer events
// Funnel simulateur : qualification → simulation → résultats → email → conversion

type EventParams = Record<string, string | number | boolean>;

interface TrackEventOptions {
  category: string;
  action: string;
  label?: string;
  value?: number;
  params?: EventParams;
}

// ─── Core ─────────────────────────────────────────────────────────────────────

const hasGtag = (): boolean =>
  typeof window !== 'undefined' && 'gtag' in window;

const pushDataLayer = (data: Record<string, unknown>): void => {
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push(data);
  }
};

export const trackEvent = ({ category, action, label, value, params }: TrackEventOptions): void => {
  const eventData = {
    event_category: category,
    event_label: label,
    value: value,
    ...params,
  };

  if (import.meta.env.DEV) {
    console.log('[Analytics]', { category, action, label, value, params });
  }

  if (hasGtag()) {
    (window as any).gtag('event', action, eventData);
  }

  pushDataLayer({ event: action, ...eventData });

  try {
    const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    events.push({ ...eventData, action, timestamp: new Date().toISOString() });
    if (events.length > 100) events.shift();
    localStorage.setItem('analytics_events', JSON.stringify(events));
  } catch (e) {
    // Ignore storage errors
  }
};

export const trackPageView = (path: string, title?: string): void => {
  if (import.meta.env.DEV) {
    console.log('[Analytics] Page View:', { path, title });
  }
  if (hasGtag()) {
    (window as any).gtag('config', 'GTM-TQP6TGS3', {
      page_path: path,
      page_title: title || document.title,
    });
  }
  pushDataLayer({
    event: 'page_view',
    page_path: path,
    page_title: title || document.title,
  });
};

// ─── Funnel simulateur ────────────────────────────────────────────────────────
// Événements dans l'ordre du parcours utilisateur

/** 1. L'utilisateur arrive sur /simulation et voit la qualification */
export const trackQualificationStart = (): void => {
  trackEvent({
    category: 'Funnel',
    action: 'qualification_start',
  });
};

/** 2. L'utilisateur répond à une question de qualification */
export const trackQualificationStep = (step: number, answer: string): void => {
  trackEvent({
    category: 'Funnel',
    action: 'qualification_step',
    label: `step_${step}`,
    params: { step, answer },
  });
};

/** 3. La qualification est complète — accès au simulateur */
export const trackQualificationComplete = (data: {
  stage: string;
  capital_range: string;
  machine_range: string;
}): void => {
  trackEvent({
    category: 'Funnel',
    action: 'qualification_complete',
    params: {
      stage: data.stage,
      capital_range: data.capital_range,
      machine_range: data.machine_range,
    },
  });
};

/** 4. Navigation entre les steps du simulateur */
export const trackSimulationStep = (step: number, stepName: string): void => {
  trackEvent({
    category: 'Funnel',
    action: 'simulation_step',
    label: stepName,
    params: { step_number: step, step_name: stepName },
  });
};

/** 5. L'utilisateur arrive sur le Step 4 Résultats */
export const trackResultsViewed = (data: {
  monthly_revenue: number;
  is_profitable: boolean;
  ici_score?: number;
}): void => {
  trackEvent({
    category: 'Funnel',
    action: 'results_viewed',
    value: Math.round(data.monthly_revenue),
    params: {
      monthly_revenue: Math.round(data.monthly_revenue),
      is_profitable: data.is_profitable,
      ici_score: data.ici_score ?? 0,
    },
  });
};

/** 6. L'utilisateur ouvre la modal email */
export const trackEmailModalOpened = (ab_variant: 'A' | 'B'): void => {
  trackEvent({
    category: 'Funnel',
    action: 'email_modal_opened',
    params: { ab_variant },
  });
};

/** 7. L'utilisateur soumet son email */
export const trackEmailSubmitted = (data: {
  segmentation_type: string;
  ab_variant: 'A' | 'B';
  ici_score: number;
}): void => {
  trackEvent({
    category: 'Funnel',
    action: 'email_submitted',
    label: data.segmentation_type,
    params: {
      segmentation_type: data.segmentation_type,
      ab_variant: data.ab_variant,
      ici_score: Math.round(data.ici_score),
    },
  });
};

/** 8. L'utilisateur clique sur le CTA de la SegmentedRedirect */
export const trackSegmentCTAClicked = (data: {
  segmentation_type: string;
  destination: string;
}): void => {
  trackEvent({
    category: 'Funnel',
    action: 'segment_cta_clicked',
    label: data.segmentation_type,
    params: {
      segmentation_type: data.segmentation_type,
      destination: data.destination,
    },
  });
};

// ─── Événements hors funnel ───────────────────────────────────────────────────

export const trackEbookClick = (location: string): void => {
  trackEvent({
    category: 'Ebook',
    action: 'click_guide_ebook',
    label: location,
    params: {
      guide_name: "Avant d'ouvrir",
      click_location: location,
    },
  });
};

export const trackSimulatorStart = (): void => {
  trackEvent({ category: 'Simulator', action: 'start_simulation' });
};

export const trackSimulatorComplete = (projectName?: string): void => {
  trackEvent({ category: 'Simulator', action: 'complete_simulation', label: projectName });
};

export const trackPdfDownload = (reportType: string): void => {
  trackEvent({ category: 'Download', action: 'download_pdf', label: reportType });
};

export const trackContactSubmit = (): void => {
  trackEvent({ category: 'Contact', action: 'submit_contact_form' });
};

export const trackPackCTAClicked = (packName: string, location: string): void => {
  trackEvent({
    category: 'Conversion',
    action: 'pack_cta_clicked',
    label: packName,
    params: { pack_name: packName, click_location: location },
  });
};

// ─── Debug ────────────────────────────────────────────────────────────────────

export const getStoredEvents = (): any[] => {
  try {
    return JSON.parse(localStorage.getItem('analytics_events') || '[]');
  } catch {
    return [];
  }
};

export const clearStoredEvents = (): void => {
  localStorage.removeItem('analytics_events');
};
