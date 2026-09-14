/**
 * Primary sources cited by the guided tools.
 *
 * Each entry was opened and the cited provisions read on SOURCES_CHECKED_AT.
 * Recheck them, and any later amendments or Commission guidance, before a
 * rule set is marked as reviewed.
 */

export type SourceId =
  | 'cra'
  | 'cra-categories'
  | 'ec-cra-summary'
  | 'ec-cra-reporting'
  | 'red'
  | 'red-da'
  | 'red-da-repeal'
  | 'en-18031-citation'
  | 'ec-red';

export interface Source {
  id: SourceId;
  title: string;
  publisher: string;
  url: string;
}

export const SOURCES_CHECKED_AT = '2026-09-13';

export const SOURCES: Record<SourceId, Source> = {
  cra: {
    id: 'cra',
    title: 'Regulation (EU) 2024/2847 (Cyber Resilience Act)',
    publisher: 'Official Journal of the European Union',
    url: 'https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng',
  },
  'cra-categories': {
    id: 'cra-categories',
    title: 'Implementing Regulation (EU) 2025/2392 on the technical description of important and critical products',
    publisher: 'Official Journal of the European Union',
    url: 'https://eur-lex.europa.eu/eli/reg_impl/2025/2392/oj/eng',
  },
  'ec-cra-summary': {
    id: 'ec-cra-summary',
    title: 'The Cyber Resilience Act: summary of the legislative text',
    publisher: 'European Commission',
    url: 'https://digital-strategy.ec.europa.eu/en/policies/cra-summary',
  },
  'ec-cra-reporting': {
    id: 'ec-cra-reporting',
    title: 'Cyber Resilience Act: reporting obligations',
    publisher: 'European Commission',
    url: 'https://digital-strategy.ec.europa.eu/en/policies/cra-reporting',
  },
  red: {
    id: 'red',
    title: 'Directive 2014/53/EU (Radio Equipment Directive)',
    publisher: 'Official Journal of the European Union',
    url: 'https://eur-lex.europa.eu/eli/dir/2014/53/oj/eng',
  },
  'red-da': {
    id: 'red-da',
    title: 'Delegated Regulation (EU) 2022/30, as amended by Delegated Regulation (EU) 2023/2444',
    publisher: 'Official Journal of the European Union',
    url: 'https://eur-lex.europa.eu/eli/reg_del/2022/30/oj/eng',
  },
  'red-da-repeal': {
    id: 'red-da-repeal',
    title: 'Delegated Regulation (EU) 2026/339 repealing Delegated Regulation (EU) 2022/30',
    publisher: 'Official Journal of the European Union',
    url: 'https://eur-lex.europa.eu/eli/reg_del/2026/339/oj/eng',
  },
  'en-18031-citation': {
    id: 'en-18031-citation',
    title: 'Implementing Decision (EU) 2025/138 citing EN 18031-1, -2 and -3 with restrictions',
    publisher: 'Official Journal of the European Union',
    url: 'https://eur-lex.europa.eu/eli/dec_impl/2025/138/oj/eng',
  },
  'ec-red': {
    id: 'ec-red',
    title: 'Radio Equipment Directive (RED)',
    publisher: 'European Commission',
    url: 'https://single-market-economy.ec.europa.eu/sectors/electrical-and-electronic-engineering-industries-eei/radio-equipment-directive-red_en',
  },
};

export const SOURCE_ORDER = Object.keys(SOURCES) as SourceId[];
