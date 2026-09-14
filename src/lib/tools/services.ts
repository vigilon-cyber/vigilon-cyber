/**
 * Services a tool result may recommend.
 *
 * Every entry corresponds to work already described on the Vigilon service
 * pages, or to Vigilon Continuum as described by the owner (a SaaS reporting
 * platform). Do not add capabilities here until they are verified.
 */

export type ServiceId =
  | 'red-gap-analysis'
  | 'red-testing'
  | 'red-technical-file'
  | 'notified-body-prep'
  | 'cra-gap-analysis'
  | 'cra-technical-documentation'
  | 'vulnerability-handling'
  | 'sbom-management'
  | 'cra-conformity-prep'
  | 'risk-assessment'
  | 'penetration-testing'
  | 'conformity-assessment'
  | 'continuum'
  | 'expert-call';

export type ServiceKind = 'assisted' | 'platform';

export interface Service {
  id: ServiceId;
  name: string;
  href: string;
  kind: ServiceKind;
  description: string;
}

export const SERVICES: Record<ServiceId, Service> = {
  'red-gap-analysis': {
    id: 'red-gap-analysis',
    name: 'EN 18031 gap analysis',
    href: '/services/red-cyber-compliance#gap-analysis',
    kind: 'assisted',
    description: 'Review of the product design and existing security measures against EN 18031, with prioritised remediation guidance.',
  },
  'red-testing': {
    id: 'red-testing',
    name: 'RED cybersecurity testing',
    href: '/services/red-cyber-compliance#compliance-testing',
    kind: 'assisted',
    description: 'Evaluation against the applicable parts of EN 18031, producing test evidence for your technical documentation.',
  },
  'red-technical-file': {
    id: 'red-technical-file',
    name: 'RED technical file preparation',
    href: '/services/red-cyber-compliance#technical-file',
    kind: 'assisted',
    description: 'Help compiling the cybersecurity risk assessment, test reports and conformity evidence for the RED technical documentation.',
  },
  'notified-body-prep': {
    id: 'notified-body-prep',
    name: 'Notified Body preparation',
    href: '/services/red-cyber-compliance#notified-body-preparation',
    kind: 'assisted',
    description: 'Pre-testing and documentation review before a Notified Body examination.',
  },
  'cra-gap-analysis': {
    id: 'cra-gap-analysis',
    name: 'CRA gap analysis',
    href: '/services/cyber-resilience-act#gap-analysis',
    kind: 'assisted',
    description: 'Assessment of the product and your processes against the CRA essential requirements, with a prioritised plan.',
  },
  'cra-technical-documentation': {
    id: 'cra-technical-documentation',
    name: 'CRA technical documentation',
    href: '/services/cyber-resilience-act#technical-documentation',
    kind: 'assisted',
    description: 'Assembling the evidence and technical documentation (technical dossier) the CRA requires.',
  },
  'vulnerability-handling': {
    id: 'vulnerability-handling',
    name: 'Vulnerability handling and reporting process design',
    href: '/services/cyber-resilience-act#vulnerability-handling',
    kind: 'assisted',
    description: 'Designing coordinated disclosure, vulnerability handling and notification workflows.',
  },
  'sbom-management': {
    id: 'sbom-management',
    name: 'SBOM management',
    href: '/services/cyber-resilience-act#sbom',
    kind: 'assisted',
    description: 'Setting up how software bills of materials are generated, maintained and shared.',
  },
  'cra-conformity-prep': {
    id: 'cra-conformity-prep',
    name: 'Conformity assessment preparation',
    href: '/services/cyber-resilience-act#conformity-assessment-preparation',
    kind: 'assisted',
    description: 'Preparing for the conformity assessment route that applies to the product, including Notified Body examination where required.',
  },
  'risk-assessment': {
    id: 'risk-assessment',
    name: 'Risk assessment and threat modelling',
    href: '/services/risk-assessment',
    kind: 'assisted',
    description: 'Structured, documented cybersecurity risk assessment and threat modelling for the product.',
  },
  'conformity-assessment': {
    id: 'conformity-assessment',
    name: 'Conformity assessment',
    href: '/services/cyber-resilience-act#conformity-assessment',
    kind: 'assisted',
    description: 'Hands-on testing that can feed the test reports in your documentation.',
  },
  'penetration-testing': {
    id: 'penetration-testing',
    name: 'Penetration testing',
    href: '/services/penetration-testing',
    kind: 'assisted',
    description: 'Hands-on testing of devices, applications, APIs and cloud components.',
  },
  continuum: {
    id: 'continuum',
    name: 'Vigilon Continuum',
    href: '/continuum',
    kind: 'platform',
    description: 'Vigilon’s SaaS reporting platform. Ask us which capabilities are available for your process.',
  },
  'expert-call': {
    id: 'expert-call',
    name: 'Scoping conversation with a Vigilon specialist',
    href: '/request-quote',
    kind: 'assisted',
    description: 'Talk through the open questions in this result and agree what needs to be confirmed.',
  },
};
