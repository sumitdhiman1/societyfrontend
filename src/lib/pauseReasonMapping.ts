export interface PauseReasonConfig {
  header: string;
  badge: string;
  actionTitle: string;
  defaultMessage: string;
  icon?: string;
  theme: {
    bg: string;
    border: string;
    text: string;
    accent: string;
  };
}

export const PAUSE_REASON_MAPPINGS: Record<string, PauseReasonConfig> = {
  payment_overdue: {
    header: 'Payment Required',
    badge: 'Action Required: Payment',
    actionTitle: 'Payment Required',
    defaultMessage:
      'Please complete the payment from the Payments tab to resume your project. This project has been paused until then.',
    icon: '💳',
    theme: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-800',
      accent: 'text-amber-700',
    },
  },
  approval_pending: {
    header: 'Approval Required',
    badge: 'Action Required: Approval',
    actionTitle: 'Approval Required',
    defaultMessage:
      'Please provide approval or feedback to resume your project. This project has been paused until then.',
    icon: '📋',
    theme: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-800',
      accent: 'text-amber-700',
    },
  },
  content_pending: {
    header: 'Content Required',
    badge: 'Action Required: Provide Content',
    actionTitle: 'Content Required',
    defaultMessage:
      'Please provide the requested content to resume your project. This project has been paused until then.',
    icon: '📁',
    theme: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-800',
      accent: 'text-amber-700',
    },
  },
  review_pending: {
    header: 'Review Required',
    badge: 'Action Required: Review',
    actionTitle: 'Review Required',
    defaultMessage:
      'A review request has been sent and is awaiting your feedback.',
    icon: '🔍',
    theme: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-800',
      accent: 'text-amber-700',
    },
  },
  client_request: {
    header: 'Paused by Request',
    badge: 'Project On Hold',
    actionTitle: 'Project Paused',
    defaultMessage:
      'This project has been paused per your request.',
    icon: '⏸',
    theme: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-800',
      accent: 'text-amber-700',
    },
  },
  reactivated: {
    header: 'Project Reactivated After Completion',
    badge: 'Project Reactivated',
    actionTitle: 'Project Reactivated',
    defaultMessage: 'Your project has been reactivated by the project manager.',
    icon: '▶️',
    theme: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      text: 'text-emerald-800',
      accent: 'text-emerald-700',
    },
  },
  manager_assigned: {
    header: 'Project Manager Assigned',
    badge: 'Project Manager Assigned',
    actionTitle: 'Project Manager Assigned',
    defaultMessage: 'A project manager has been assigned to your project.',
    icon: '👤',
    theme: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-800',
      accent: 'text-blue-700',
    },
  },
  deadline_adjusted: {
    header: 'Deadline Adjusted',
    badge: 'Deadline Adjusted',
    actionTitle: 'Deadline Adjusted',
    defaultMessage: 'The project deadline has been extended by 0 day(s), 0 hour(s) and 0 minute(s), because the project has been paused for that long.',
    icon: '⏳',
    theme: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-800',
      accent: 'text-blue-700',
    },
  },
  offer_received: {
    header: 'You Received an Offer',
    badge: 'You Received an Offer',
    actionTitle: 'Offer Received',
    defaultMessage: 'Your project manager has created a new offer containing deliverable item(s).',
    icon: '🎁',
    theme: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-800',
      accent: 'text-blue-700',
    },
  },
  proposal_accepted: {
    header: 'Proposal Accepted',
    badge: 'Proposal Accepted',
    actionTitle: 'Proposal Accepted',
    defaultMessage: 'Confirmed! You accepted the offered quote.',
    icon: '✅',
    theme: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      text: 'text-emerald-800',
      accent: 'text-emerald-700',
    },
  },
  proposal_declined: {
    header: 'Proposal Declined',
    badge: 'Proposal Declined',
    actionTitle: 'Proposal Declined',
    defaultMessage: 'The offer was declined.',
    icon: '❌',
    theme: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-800',
      accent: 'text-red-700',
    },
  },
  modifications_requested: {
    header: 'Modifications Requested',
    badge: 'Modifications Requested',
    actionTitle: 'Modifications Requested',
    defaultMessage: 'The client requested modifications.',
    icon: '🔄',
    theme: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-800',
      accent: 'text-amber-700',
    },
  },
  quote_request_submitted: {
    header: 'Quote Request Submitted',
    badge: 'Quote Request Submitted',
    actionTitle: 'Quote Request Submitted',
    defaultMessage:
      'Thank you for submitting your request! Our team is reviewing and will provide a custom quote shortly.',
    icon: '📝',
    theme: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-800',
      accent: 'text-blue-700',
    },
  },
  custom_quote_sent: {
    header: 'You Received an Offer',
    badge: 'You Received an Offer',
    actionTitle: 'Custom Quote Sent',
    defaultMessage: 'We’ve prepared a custom proposal for your project.',
    icon: '🎁',
    theme: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-800',
      accent: 'text-blue-700',
    },
  },
  quote_converted: {
    header: 'Project Created',
    badge: 'Project Created',
    actionTitle: 'Quote Converted into Project',
    defaultMessage: 'Great news! Your quote has been converted into an active project.',
    icon: '🚀',
    theme: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      text: 'text-emerald-800',
      accent: 'text-emerald-700',
    },
  },
  quote_declined: {
    header: 'Quote Declined',
    badge: 'Quote Declined',
    actionTitle: 'Quote Declined',
    defaultMessage: 'The offered quote has been declined.',
    icon: '❌',
    theme: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-800',
      accent: 'text-red-700',
    },
  },
  reopening_requested: {
    header: 'Reopening Requested',
    badge: 'Reopening Requested',
    actionTitle: 'Reopening Requested',
    defaultMessage: 'The client requested to reopen this quote.',
    icon: '🔄',
    theme: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-800',
      accent: 'text-amber-700',
    },
  },
  payment_received: {
    header: 'Payment Received',
    badge: 'Payment Received',
    actionTitle: 'Payment Received',
    defaultMessage: 'Payment received. Your project is now active.',
    icon: '💳',
    theme: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      text: 'text-emerald-800',
      accent: 'text-emerald-700',
    },
  },
  payment_request_issued: {
    header: 'Payment Request Issued',
    badge: 'Payment Request',
    actionTitle: 'Payment Request Issued',
    defaultMessage: 'A payment request has been issued for your project.',
    icon: '💰',
    theme: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-800',
      accent: 'text-blue-700',
    },
  },
  monthly_renewal_request: {
    header: 'Monthly Renewal Request',
    badge: 'Monthly Renewal Request',
    actionTitle: 'Monthly Renewal Request',
    defaultMessage: 'A renewal of your monthly subscription has been requested.',
    icon: '🔄',
    theme: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-800',
      accent: 'text-blue-700',
    },
  },
  payment_failed: {
    header: 'Payment Failed',
    badge: 'Payment Failed',
    actionTitle: 'Payment Failed',
    defaultMessage: 'Payment attempt failed.',
    icon: '⚠️',
    theme: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-800',
      accent: 'text-red-700',
    },
  },
  default: {
    header: 'Project Paused',
    badge: 'Project Paused',
    actionTitle: 'Project Paused',
    defaultMessage: 'Your project has been paused.',
    icon: '⏸',
    theme: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-800',
      accent: 'text-amber-700',
    },
  },
};

/**
 * Resolves the pause reason configuration from a reason string and/or message content text.
 */
export function getPauseReasonConfig(reason?: string, messageText?: string): PauseReasonConfig {
  const r = (reason || '').toLowerCase().trim();
  const m = (messageText || '').toLowerCase().trim();

  if (
    r.includes('quote_request_submitted') ||
    r.includes('quote request submitted') ||
    m.includes('quote request submitted') ||
    m.includes('submitting your request') ||
    m.includes('reviewing and will provide a custom quote')
  ) {
    return PAUSE_REASON_MAPPINGS.quote_request_submitted;
  }

  if (
    r.includes('custom_quote_sent') ||
    r.includes('custom quote sent') ||
    m.includes('custom quote sent') ||
    m.includes('prepared a custom proposal') ||
    m.includes("we’ve prepared a custom proposal") ||
    m.includes("we've prepared a custom proposal")
  ) {
    return PAUSE_REASON_MAPPINGS.custom_quote_sent;
  }

  if (
    r.includes('quote_converted') ||
    r.includes('quote converted') ||
    m.includes('quote converted') ||
    m.includes('converted into an active project') ||
    m.includes('converted into a project')
  ) {
    return PAUSE_REASON_MAPPINGS.quote_converted;
  }

  if (
    r.includes('quote_declined') ||
    r.includes('quote declined') ||
    m.includes('quote declined') ||
    m.includes('offered quote has been declined') ||
    m.includes('the offered quote has been declined')
  ) {
    return PAUSE_REASON_MAPPINGS.quote_declined;
  }

  if (
    r.includes('reopening_requested') ||
    r.includes('reopening requested') ||
    r.includes('reopen') ||
    m.includes('reopening requested') ||
    m.includes('reopen this quote') ||
    m.includes('requested to reopen this quote')
  ) {
    return PAUSE_REASON_MAPPINGS.reopening_requested;
  }

  if (
    r.includes('payment_failed') ||
    r.includes('payment failed') ||
    m.includes('payment failed') ||
    m.includes('payment attempt') ||
    m.includes('payment failed.') ||
    m.includes('failed.')
  ) {
    return PAUSE_REASON_MAPPINGS.payment_failed;
  }

  if (
    r.includes('payment_received') ||
    r.includes('payment received') ||
    m.includes('payment received') ||
    m.includes('payment of') ||
    m.includes('received. your project is now active') ||
    m.includes('payment received for invoice')
  ) {
    return PAUSE_REASON_MAPPINGS.payment_received;
  }

  if (
    r.includes('monthly_renewal_request') ||
    r.includes('monthly renewal request') ||
    r.includes('renewal request') ||
    m.includes('monthly renewal request') ||
    m.includes('renewal of your monthly subscription')
  ) {
    return PAUSE_REASON_MAPPINGS.monthly_renewal_request;
  }

  if (
    r.includes('payment_request') ||
    r.includes('payment request') ||
    m.includes('payment request') ||
    m.includes('payment request has been issued')
  ) {
    return PAUSE_REASON_MAPPINGS.payment_request_issued;
  }

  if (
    r.includes('payment') ||
    r === 'payment_overdue' ||
    m.includes('complete the payment') ||
    m.includes('payment tab') ||
    m.includes('payments tab') ||
    m.includes('payment deadline') ||
    m.includes('action required: payment') ||
    m.includes('payment required')
  ) {
    return PAUSE_REASON_MAPPINGS.payment_overdue;
  }

  if (
    r.includes('approval') ||
    r === 'approval_pending' ||
    m.includes('approval') ||
    m.includes('action required: approval') ||
    m.includes('approval required')
  ) {
    return PAUSE_REASON_MAPPINGS.approval_pending;
  }

  if (
    r.includes('content') ||
    r === 'content_pending' ||
    m.includes('content') ||
    m.includes('provide content') ||
    m.includes('action required: provide content') ||
    m.includes('action required: content') ||
    m.includes('content required')
  ) {
    return PAUSE_REASON_MAPPINGS.content_pending;
  }

  if (
    r.includes('review') ||
    r === 'review_pending' ||
    m.includes('review') ||
    m.includes('action required: review') ||
    m.includes('review required')
  ) {
    return PAUSE_REASON_MAPPINGS.review_pending;
  }

  if (r.includes('client') || r === 'client_request' || r === 'client_requested') {
    return PAUSE_REASON_MAPPINGS.client_request;
  }

  if (r.includes('reactivate') || m.includes('reactivate') || m.includes('reactivated')) {
    return PAUSE_REASON_MAPPINGS.reactivated;
  }

  if (r.includes('manager') || m.includes('manager assigned') || m.includes('assigned as project manager') || m.includes('assigned to your project')) {
    return PAUSE_REASON_MAPPINGS.manager_assigned;
  }

  if (r.includes('offer') || m.includes('offer received') || m.includes('you received an offer') || m.includes('created a new offer') || m.includes('sent you a new offer')) {
    return PAUSE_REASON_MAPPINGS.offer_received;
  }

  if (r.includes('proposal_accepted') || r.includes('proposal accepted') || m.includes('proposal accepted') || m.includes('accepted the offered quote')) {
    return PAUSE_REASON_MAPPINGS.proposal_accepted;
  }

  if (r.includes('proposal_declined') || r.includes('proposal declined') || m.includes('proposal declined') || m.includes('the offer was declined') || m.includes('offer was declined')) {
    return PAUSE_REASON_MAPPINGS.proposal_declined;
  }

  if (r.includes('modification') || m.includes('modifications requested') || m.includes('modification requested') || m.includes('client requested modifications') || m.includes('requested modifications')) {
    return PAUSE_REASON_MAPPINGS.modifications_requested;
  }

  return PAUSE_REASON_MAPPINGS.default;
}
