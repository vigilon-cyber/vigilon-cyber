/**
 * Question registry shared by all guided tools.
 *
 * A question keeps the same id in every tool, so an answer given in one tool
 * is reused by the others instead of being asked again. Visibility is
 * decided per tool in each tool's path.
 */

import type { Option, Question } from './types.ts';

const unsure: Option = { id: 'unsure', label: 'I’m not sure', unsure: true, exclusive: true };

function question(definition: Question): Question {
  return definition;
}

export const QUESTIONS: Record<string, Question> = {
  eu_role: question({
    id: 'eu_role',
    kind: 'single',
    title: 'What is your role in supplying this product in the EU?',
    hint: 'Answer for one product or product family.',
    summaryLabel: 'Role in the EU',
    explainer: {
      summary: 'What if we change a product made by someone else?',
      body: [
        'Under both the Cyber Resilience Act and the Radio Equipment Directive, an importer or distributor that places a product on the market under its own name or trademark, or modifies it in a way that affects compliance, is treated as its manufacturer.',
        'If that describes you, choose the first option.',
      ],
    },
    unsureNote: 'Confirm who places the product on the EU market and under whose name — that decides who carries the manufacturer’s obligations.',
    options: [
      {
        id: 'manufacturer',
        label: 'We make it, or have it made, and supply it under our own name or brand',
      },
      { id: 'importer', label: 'We are based in the EU and bring in a product sold under a non-EU company’s name' },
      { id: 'distributor', label: 'We distribute or resell it in the EU without changing it' },
      { id: 'not_eu', label: 'It won’t be supplied in the EU' },
      unsure,
    ],
  }),

  radio: question({
    id: 'radio',
    kind: 'single',
    title: 'Does the product intentionally send or receive radio signals?',
    hint: 'For example Wi‑Fi, Bluetooth, cellular, Zigbee, Thread, LoRa, NFC, UWB or satellite positioning (GNSS).',
    summaryLabel: 'Radio functions',
    explainer: {
      summary: 'What counts as radio equipment?',
      body: [
        'The Radio Equipment Directive covers electrical or electronic products that intentionally emit or receive radio waves for communication or for radiodetermination, such as positioning. Receive-only functions count.',
        'A product that needs an accessory, such as an antenna, to do this also counts.',
      ],
    },
    unsureNote: 'Check the product’s radio modules, including receive-only functions such as GNSS.',
    options: [
      { id: 'yes', label: 'Yes', hint: 'Including receive-only radio functions.' },
      { id: 'no', label: 'No' },
      unsure,
    ],
  }),

  internet: question({
    id: 'internet',
    kind: 'single',
    title: 'Can the product communicate over the internet, directly or through another device?',
    hint: 'Through another device includes a phone app, hub, gateway or router that relays its data.',
    summaryLabel: 'Internet communication',
    unsureNote: 'Check whether any function — including updates, companion apps or remote access — relies on internet communication.',
    options: [
      { id: 'direct', label: 'Yes, directly' },
      { id: 'via_device', label: 'Yes, through another device' },
      { id: 'no', label: 'No' },
      unsure,
    ],
  }),

  special_category: question({
    id: 'special_category',
    kind: 'multi',
    title: 'Is the product any of the following?',
    hint: 'Select all that apply.',
    summaryLabel: 'Childcare, toy or wearable',
    unsureNote: 'Confirm whether the product is designed for childcare, is a toy, or is designed to be worn.',
    options: [
      { id: 'childcare', label: 'Designed or intended only for childcare', hint: 'For example a baby monitor.' },
      { id: 'toy', label: 'A toy', hint: 'Covered by the Toy Safety Directive 2009/48/EC.' },
      {
        id: 'wearable',
        label: 'Designed to be worn on, strapped to or hung from the body or clothing',
        hint: 'Including headwear, hand wear and footwear.',
      },
      { id: 'none', label: 'None of these', exclusive: true },
      unsure,
    ],
  }),

  data_functions: question({
    id: 'data_functions',
    kind: 'multi',
    title: 'Which of these can the product do?',
    hint: 'Select all that apply. Include functions provided through its apps or services.',
    summaryLabel: 'Data and payment functions',
    explainer: {
      summary: 'What counts as personal, traffic or location data?',
      body: [
        'Personal data is information about an identifiable person — for example account details, voice recordings, images, or usage and health data linked to a user.',
        'Traffic data is data processed to carry a communication over a network or to bill for it. Location data indicates the geographic position of a user’s equipment.',
      ],
    },
    unsureNote: 'Map what data the product and its apps process, and whether any payment or value-transfer feature exists.',
    options: [
      { id: 'personal', label: 'Process personal data' },
      { id: 'traffic_location', label: 'Process traffic or location data' },
      { id: 'money', label: 'Let the holder or user transfer money, monetary value or virtual currency' },
      { id: 'none', label: 'None of these', exclusive: true },
      unsure,
    ],
  }),

  sector_rules: question({
    id: 'sector_rules',
    kind: 'multi',
    title: 'Do any of these other EU rules or situations apply to the product?',
    hint: 'Select all that apply. They can change which cybersecurity rules apply.',
    summaryLabel: 'Other rules',
    unsureNote: 'Check the product’s regulatory classification with whoever manages its other certifications.',
    options: [
      { id: 'medical', label: 'Medical device or in vitro diagnostic medical device', hint: 'Regulation (EU) 2017/745 or (EU) 2017/746.' },
      { id: 'vehicle', label: 'Motor vehicle type-approval', hint: 'Regulation (EU) 2019/2144.' },
      { id: 'aviation', label: 'Civil aviation', hint: 'Regulation (EU) 2018/1139, including products certified under it.' },
      { id: 'marine', label: 'Marine equipment', hint: 'Directive 2014/90/EU.' },
      { id: 'toll', label: 'Electronic road toll systems', hint: 'Directive (EU) 2019/520.' },
      { id: 'defence', label: 'Developed only for national security or defence, or to process classified information' },
      { id: 'spare_part', label: 'A spare part replacing an identical component, made to the same specifications' },
      { id: 'none', label: 'None of these', exclusive: true },
      unsure,
    ],
  }),

  market_timing: question({
    id: 'market_timing',
    kind: 'single',
    title: 'When will this product be placed on the EU market?',
    hint: 'Placing on the market means first making the product available in the EU.',
    summaryLabel: 'EU market timing',
    whyWeAsk:
      'Rules change on 11 December 2027: the main Cyber Resilience Act requirements apply from that date, and the RED cybersecurity delegated regulation is repealed from the same date.',
    unsureNote: 'Confirm your planned EU launch and supply dates.',
    options: [
      { id: 'before_2027', label: 'Only before 11 December 2027', hint: 'Including products already on the market that stop being supplied before then.' },
      { id: 'spans', label: 'Before 11 December 2027, and continuing after it' },
      { id: 'from_2027', label: 'Only from 11 December 2027 onwards' },
      unsure,
    ],
  }),

  product_kind: question({
    id: 'product_kind',
    kind: 'single',
    title: 'Which best describes what you supply?',
    summaryLabel: 'What you supply',
    unsureNote: 'Describe exactly what customers receive: a device, installable software, a component, or access to a service.',
    options: [
      { id: 'hardware', label: 'A physical product with software or firmware' },
      { id: 'software', label: 'Software that customers download, install or run, including apps' },
      { id: 'component', label: 'A hardware or software component sold separately for others to integrate' },
      {
        id: 'online_service',
        label: 'An online service only — no product is supplied to customers',
        hint: 'For example a website or software as a service.',
      },
      unsure,
    ],
  }),

  data_connection: question({
    id: 'data_connection',
    kind: 'single',
    title: 'Can the product connect to a device or network?',
    hint: 'Any data connection counts — for example Wi‑Fi, Bluetooth, Ethernet, cellular or USB.',
    summaryLabel: 'Data connection',
    explainer: {
      summary: 'What counts as a connection?',
      body: [
        'The CRA covers products whose intended purpose or reasonably foreseeable use includes a direct or indirect logical or physical data connection to a device or network.',
        'Physical connections include wires, optical links and radio. An indirect connection is one made as part of a larger system that connects to the device or network.',
      ],
    },
    unsureNote: 'Check every interface, including service, debug and update ports, and how the product is used inside larger systems.',
    options: [
      { id: 'direct', label: 'Yes, directly' },
      { id: 'indirect', label: 'Yes, but only indirectly, as part of a larger system' },
      { id: 'none', label: 'No — it has no data connection of any kind' },
      unsure,
    ],
  }),

  remote_processing: question({
    id: 'remote_processing',
    kind: 'single',
    title: 'Does the product rely on a remote or cloud service that you develop, or have developed for you?',
    hint: 'Answer yes only if one of the product’s functions would not work without that service — for example an app that needs your API, or remote control of a device through your cloud.',
    summaryLabel: 'Remote data processing',
    unsureNote: 'List which functions depend on services you run or commission, and which rely only on third-party services.',
    options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }, unsure],
  }),

  commercial: question({
    id: 'commercial',
    kind: 'single',
    title: 'How is the product made available?',
    summaryLabel: 'How it is made available',
    unsureNote: 'Check whether you charge for the product, its support or related services, or otherwise monetise it.',
    options: [
      {
        id: 'monetised',
        label: 'We sell, license or otherwise monetise it',
        hint: 'Including free products used to monetise related services or data.',
      },
      { id: 'free', label: 'Free of charge, and not open source' },
      { id: 'foss', label: 'As free and open-source software that we don’t monetise' },
      {
        id: 'steward',
        label: 'We sustain open-source software intended for commercial use, as a foundation or similar organisation',
      },
      unsure,
    ],
  }),

  core_function: question({
    id: 'core_function',
    kind: 'single',
    title: 'Is the product’s core function on the CRA list of important or critical products?',
    hint: 'Only the core function counts. Integrating a component such as a browser or firewall doesn’t by itself change the category.',
    summaryLabel: 'CRA product category',
    explainer: {
      summary: 'View the product lists',
      body: [
        'Important, class I: identity management and privileged access management systems, including authentication and access control readers; standalone and embedded browsers; password managers; software that searches for, removes or quarantines malicious software; VPN products; network management systems; SIEM systems; boot managers; public key infrastructure and digital certificate issuance software; physical and virtual network interfaces; operating systems; routers, internet modems and switches; microprocessors, microcontrollers, ASICs and FPGAs with security-related functionalities; smart home general purpose virtual assistants; smart home products with security functionalities, such as smart door locks, security cameras, baby monitoring systems and alarm systems; internet-connected toys with social interactive or location tracking features; personal wearables with a health monitoring purpose not covered by medical device rules, or intended for use by children.',
        'Important, class II: hypervisors and container runtime systems; firewalls and intrusion detection and prevention systems; tamper-resistant microprocessors and microcontrollers.',
        'Critical: hardware devices with security boxes; smart meter gateways and other devices for advanced security purposes, including secure cryptoprocessing; smartcards or similar devices, including secure elements.',
        'Implementing Regulation (EU) 2025/2392 sets out the technical description of each category.',
      ],
    },
    unsureNote: 'Compare the product’s core function with the technical descriptions in Implementing Regulation (EU) 2025/2392.',
    options: [
      { id: 'class_i', label: 'Yes — important product, class I' },
      { id: 'class_ii', label: 'Yes — important product, class II' },
      { id: 'critical', label: 'Yes — critical product' },
      { id: 'none', label: 'No — its core function isn’t on these lists' },
      unsure,
    ],
  }),

  risk_assessment: question({
    id: 'risk_assessment',
    kind: 'single',
    title: 'Do you have a documented cybersecurity risk assessment for this product?',
    summaryLabel: 'Risk assessment',
    unsureNote: 'Ask engineering or product security whether a documented risk assessment or threat model exists.',
    options: [
      { id: 'current', label: 'Yes, and it reflects the current design' },
      { id: 'partial', label: 'Partly, or it is out of date' },
      { id: 'none', label: 'No' },
      unsure,
    ],
  }),

  test_evidence: question({
    id: 'test_evidence',
    kind: 'single',
    title: 'What security test evidence do you have for the product?',
    summaryLabel: 'Test evidence',
    unsureNote: 'Collect recent test reports and check what requirements they were tested against.',
    options: [
      { id: 'structured', label: 'Recent testing mapped to security requirements or a relevant standard' },
      { id: 'informal', label: 'Some testing, but not documented against requirements' },
      { id: 'none', label: 'None yet' },
      unsure,
    ],
  }),

  tech_docs: question({
    id: 'tech_docs',
    kind: 'single',
    title: 'How far along is the product’s cybersecurity technical documentation?',
    hint: 'Sometimes called a technical file or technical dossier.',
    summaryLabel: 'Technical documentation',
    unsureNote: 'Find out whether design, risk, vulnerability handling and test information is already collected in one place.',
    options: [
      { id: 'mostly', label: 'Largely assembled' },
      { id: 'started', label: 'Started, with gaps' },
      { id: 'none', label: 'Not started' },
      unsure,
    ],
  }),

  sbom: question({
    id: 'sbom',
    kind: 'single',
    title: 'Can you produce a machine-readable software bill of materials (SBOM) for the product?',
    summaryLabel: 'SBOM',
    explainer: {
      summary: 'What is an SBOM?',
      body: [
        'A software bill of materials is a formal record of the components in a product’s software and their supply-chain relationships.',
        'The CRA expects one in a commonly used, machine-readable format covering at least the product’s top-level dependencies.',
      ],
    },
    unsureNote: 'Ask your build or release team whether component inventories are generated from the build.',
    options: [
      { id: 'maintained', label: 'Yes, generated and kept up to date' },
      { id: 'partial', label: 'Partly, or only as a one-off' },
      { id: 'none', label: 'No' },
      unsure,
    ],
  }),

  vuln_handling: question({
    id: 'vuln_handling',
    kind: 'single',
    title: 'How are vulnerability reports for this product handled today?',
    summaryLabel: 'Vulnerability handling',
    unsureNote: 'Find out who receives security reports today and what happens next.',
    options: [
      { id: 'documented', label: 'A documented process, with a published contact and disclosure policy' },
      { id: 'informal', label: 'Someone handles them, but the process isn’t documented' },
      { id: 'none', label: 'There is no defined process' },
      unsure,
    ],
  }),

  updates: question({
    id: 'updates',
    kind: 'single',
    title: 'How will you provide security updates during the product’s support period?',
    hint: 'Under the CRA, the support period is at least five years, or shorter if the product is expected to be in use for less time.',
    summaryLabel: 'Security updates',
    unsureNote: 'Confirm how updates are delivered and whether an end-of-support date has been decided.',
    options: [
      { id: 'in_place', label: 'A secure update mechanism and a defined support period are in place' },
      { id: 'mechanism_only', label: 'We can update the product, but haven’t defined the support period' },
      { id: 'none', label: 'No reliable way to update it yet' },
      unsure,
    ],
  }),

  intake: question({
    id: 'intake',
    kind: 'single',
    title: 'How can people outside your company report a vulnerability in this product?',
    summaryLabel: 'Vulnerability intake',
    unsureNote: 'Check your website, product documentation and support channels for a security contact.',
    options: [
      { id: 'published', label: 'A published, monitored security contact or disclosure policy' },
      { id: 'general', label: 'Only a general contact address or support channel' },
      { id: 'none', label: 'There is no defined route' },
      unsure,
    ],
  }),

  triage: question({
    id: 'triage',
    kind: 'single',
    title: 'When a report arrives, is there a defined way to assess it — including whether it is being actively exploited?',
    hint: 'A vulnerability is actively exploited when there is reliable evidence that a malicious actor has exploited it in a system without the owner’s permission.',
    summaryLabel: 'Assessment and escalation',
    unsureNote: 'Ask who decides severity today and how they would recognise active exploitation.',
    options: [
      { id: 'documented', label: 'Yes, documented with named owners' },
      { id: 'ad_hoc', label: 'Handled case by case' },
      { id: 'none', label: 'No' },
      unsure,
    ],
  }),

  escalation: question({
    id: 'escalation',
    kind: 'single',
    title: 'Could you decide to notify and send an early warning within 24 hours of becoming aware, including outside business hours?',
    summaryLabel: '24-hour escalation',
    whyWeAsk:
      'Manufacturers must send an early warning of an actively exploited vulnerability, or a severe incident, within 24 hours of becoming aware of it.',
    unsureNote: 'Identify who can make a notification decision at short notice, and who covers for them.',
    options: [
      { id: 'covered', label: 'Yes, with named decision-makers and cover for absences' },
      { id: 'business_hours', label: 'Only during business hours' },
      { id: 'none', label: 'No' },
      unsure,
    ],
  }),

  notification_prep: question({
    id: 'notification_prep',
    kind: 'single',
    title: 'Do you know how you would submit notifications, what each stage must contain, and who approves them?',
    hint: 'Notifications go through the EU Single Reporting Platform, to the CSIRT for your main EU establishment, and are accessible to ENISA at the same time.',
    summaryLabel: 'Notification preparation',
    unsureNote: 'Check whether anyone has mapped the notification stages, your reporting CSIRT and internal approvals.',
    options: [
      { id: 'defined', label: 'Yes — route, content and approvers are defined' },
      { id: 'partial', label: 'Partly' },
      { id: 'none', label: 'No' },
      unsure,
    ],
  }),

  user_comms: question({
    id: 'user_comms',
    kind: 'single',
    title: 'Could you tell affected users about a vulnerability or incident, and what they should do?',
    summaryLabel: 'Informing users',
    unsureNote: 'Check which channels reach the product’s users, such as in-product notices, email or advisories.',
    options: [
      { id: 'ready', label: 'Yes, we have the channels and a process' },
      { id: 'partial', label: 'Partly' },
      { id: 'none', label: 'No' },
      unsure,
    ],
  }),

  records: question({
    id: 'records',
    kind: 'single',
    title: 'Do you keep a record of reports, decisions, notifications and follow-up actions?',
    summaryLabel: 'Records and follow-up',
    unsureNote: 'Find out where decisions about past security reports were recorded.',
    options: [
      { id: 'tracked', label: 'Yes, in a tracked system' },
      { id: 'scattered', label: 'Spread across email, chat or documents' },
      { id: 'none', label: 'No' },
      unsure,
    ],
  }),
};
