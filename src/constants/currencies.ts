export type Currency = {
  code: string;
  name: string;
  symbol: string;
  /** ISO 3166 country used for the flag. */
  country: string;
};

// Active ISO 4217 currencies. [code, name, symbol, flag country]
const RAW: [string, string, string, string][] = [
  ['AED', 'UAE Dirham', 'د.إ', 'AE'],
  ['AFN', 'Afghan Afghani', '؋', 'AF'],
  ['ALL', 'Albanian Lek', 'L', 'AL'],
  ['AMD', 'Armenian Dram', '֏', 'AM'],
  ['ANG', 'Netherlands Antillean Guilder', 'ƒ', 'CW'],
  ['AOA', 'Angolan Kwanza', 'Kz', 'AO'],
  ['ARS', 'Argentine Peso', '$', 'AR'],
  ['AUD', 'Australian Dollar', 'A$', 'AU'],
  ['AWG', 'Aruban Florin', 'ƒ', 'AW'],
  ['AZN', 'Azerbaijani Manat', '₼', 'AZ'],
  ['BAM', 'Bosnia-Herzegovina Mark', 'KM', 'BA'],
  ['BBD', 'Barbadian Dollar', '$', 'BB'],
  ['BDT', 'Bangladeshi Taka', '৳', 'BD'],
  ['BGN', 'Bulgarian Lev', 'лв', 'BG'],
  ['BHD', 'Bahraini Dinar', '.د.ب', 'BH'],
  ['BIF', 'Burundian Franc', 'FBu', 'BI'],
  ['BMD', 'Bermudian Dollar', '$', 'BM'],
  ['BND', 'Brunei Dollar', '$', 'BN'],
  ['BOB', 'Bolivian Boliviano', 'Bs', 'BO'],
  ['BRL', 'Brazilian Real', 'R$', 'BR'],
  ['BSD', 'Bahamian Dollar', '$', 'BS'],
  ['BTN', 'Bhutanese Ngultrum', 'Nu.', 'BT'],
  ['BWP', 'Botswana Pula', 'P', 'BW'],
  ['BYN', 'Belarusian Ruble', 'Br', 'BY'],
  ['BZD', 'Belize Dollar', '$', 'BZ'],
  ['CAD', 'Canadian Dollar', 'C$', 'CA'],
  ['CDF', 'Congolese Franc', 'FC', 'CD'],
  ['CHF', 'Swiss Franc', 'CHF', 'CH'],
  ['CLP', 'Chilean Peso', '$', 'CL'],
  ['CNY', 'Chinese Yuan', '¥', 'CN'],
  ['COP', 'Colombian Peso', '$', 'CO'],
  ['CRC', 'Costa Rican Colón', '₡', 'CR'],
  ['CUP', 'Cuban Peso', '$', 'CU'],
  ['CVE', 'Cape Verdean Escudo', '$', 'CV'],
  ['CZK', 'Czech Koruna', 'Kč', 'CZ'],
  ['DJF', 'Djiboutian Franc', 'Fdj', 'DJ'],
  ['DKK', 'Danish Krone', 'kr', 'DK'],
  ['DOP', 'Dominican Peso', 'RD$', 'DO'],
  ['DZD', 'Algerian Dinar', 'د.ج', 'DZ'],
  ['EGP', 'Egyptian Pound', 'E£', 'EG'],
  ['ERN', 'Eritrean Nakfa', 'Nfk', 'ER'],
  ['ETB', 'Ethiopian Birr', 'Br', 'ET'],
  ['EUR', 'Euro', '€', 'EU'],
  ['FJD', 'Fijian Dollar', '$', 'FJ'],
  ['FKP', 'Falkland Islands Pound', '£', 'FK'],
  ['GBP', 'British Pound', '£', 'GB'],
  ['GEL', 'Georgian Lari', '₾', 'GE'],
  ['GHS', 'Ghanaian Cedi', '₵', 'GH'],
  ['GIP', 'Gibraltar Pound', '£', 'GI'],
  ['GMD', 'Gambian Dalasi', 'D', 'GM'],
  ['GNF', 'Guinean Franc', 'FG', 'GN'],
  ['GTQ', 'Guatemalan Quetzal', 'Q', 'GT'],
  ['GYD', 'Guyanese Dollar', '$', 'GY'],
  ['HKD', 'Hong Kong Dollar', 'HK$', 'HK'],
  ['HNL', 'Honduran Lempira', 'L', 'HN'],
  ['HTG', 'Haitian Gourde', 'G', 'HT'],
  ['HUF', 'Hungarian Forint', 'Ft', 'HU'],
  ['IDR', 'Indonesian Rupiah', 'Rp', 'ID'],
  ['ILS', 'Israeli New Shekel', '₪', 'IL'],
  ['INR', 'Indian Rupee', '₹', 'IN'],
  ['IQD', 'Iraqi Dinar', 'ع.د', 'IQ'],
  ['IRR', 'Iranian Rial', '﷼', 'IR'],
  ['ISK', 'Icelandic Króna', 'kr', 'IS'],
  ['JMD', 'Jamaican Dollar', 'J$', 'JM'],
  ['JOD', 'Jordanian Dinar', 'د.ا', 'JO'],
  ['JPY', 'Japanese Yen', '¥', 'JP'],
  ['KES', 'Kenyan Shilling', 'KSh', 'KE'],
  ['KGS', 'Kyrgystani Som', 'с', 'KG'],
  ['KHR', 'Cambodian Riel', '៛', 'KH'],
  ['KMF', 'Comorian Franc', 'CF', 'KM'],
  ['KPW', 'North Korean Won', '₩', 'KP'],
  ['KRW', 'South Korean Won', '₩', 'KR'],
  ['KWD', 'Kuwaiti Dinar', 'د.ك', 'KW'],
  ['KYD', 'Cayman Islands Dollar', '$', 'KY'],
  ['KZT', 'Kazakhstani Tenge', '₸', 'KZ'],
  ['LAK', 'Laotian Kip', '₭', 'LA'],
  ['LBP', 'Lebanese Pound', 'ل.ل', 'LB'],
  ['LKR', 'Sri Lankan Rupee', 'Rs', 'LK'],
  ['LRD', 'Liberian Dollar', '$', 'LR'],
  ['LSL', 'Lesotho Loti', 'L', 'LS'],
  ['LYD', 'Libyan Dinar', 'ل.د', 'LY'],
  ['MAD', 'Moroccan Dirham', 'د.م.', 'MA'],
  ['MDL', 'Moldovan Leu', 'L', 'MD'],
  ['MGA', 'Malagasy Ariary', 'Ar', 'MG'],
  ['MKD', 'Macedonian Denar', 'ден', 'MK'],
  ['MMK', 'Myanmar Kyat', 'K', 'MM'],
  ['MNT', 'Mongolian Tugrik', '₮', 'MN'],
  ['MOP', 'Macanese Pataca', 'MOP$', 'MO'],
  ['MRU', 'Mauritanian Ouguiya', 'UM', 'MR'],
  ['MUR', 'Mauritian Rupee', '₨', 'MU'],
  ['MVR', 'Maldivian Rufiyaa', 'Rf', 'MV'],
  ['MWK', 'Malawian Kwacha', 'MK', 'MW'],
  ['MXN', 'Mexican Peso', 'MX$', 'MX'],
  ['MYR', 'Malaysian Ringgit', 'RM', 'MY'],
  ['MZN', 'Mozambican Metical', 'MT', 'MZ'],
  ['NAD', 'Namibian Dollar', '$', 'NA'],
  ['NGN', 'Nigerian Naira', '₦', 'NG'],
  ['NIO', 'Nicaraguan Córdoba', 'C$', 'NI'],
  ['NOK', 'Norwegian Krone', 'kr', 'NO'],
  ['NPR', 'Nepalese Rupee', 'Rs', 'NP'],
  ['NZD', 'New Zealand Dollar', 'NZ$', 'NZ'],
  ['OMR', 'Omani Rial', 'ر.ع.', 'OM'],
  ['PAB', 'Panamanian Balboa', 'B/.', 'PA'],
  ['PEN', 'Peruvian Sol', 'S/', 'PE'],
  ['PGK', 'Papua New Guinean Kina', 'K', 'PG'],
  ['PHP', 'Philippine Peso', '₱', 'PH'],
  ['PKR', 'Pakistani Rupee', 'Rs', 'PK'],
  ['PLN', 'Polish Złoty', 'zł', 'PL'],
  ['PYG', 'Paraguayan Guarani', '₲', 'PY'],
  ['QAR', 'Qatari Riyal', 'ر.ق', 'QA'],
  ['RON', 'Romanian Leu', 'lei', 'RO'],
  ['RSD', 'Serbian Dinar', 'дин.', 'RS'],
  ['RUB', 'Russian Ruble', '₽', 'RU'],
  ['RWF', 'Rwandan Franc', 'FRw', 'RW'],
  ['SAR', 'Saudi Riyal', 'ر.س', 'SA'],
  ['SBD', 'Solomon Islands Dollar', '$', 'SB'],
  ['SCR', 'Seychellois Rupee', '₨', 'SC'],
  ['SDG', 'Sudanese Pound', 'ج.س.', 'SD'],
  ['SEK', 'Swedish Krona', 'kr', 'SE'],
  ['SGD', 'Singapore Dollar', 'S$', 'SG'],
  ['SHP', 'St. Helena Pound', '£', 'SH'],
  ['SLE', 'Sierra Leonean Leone', 'Le', 'SL'],
  ['SOS', 'Somali Shilling', 'Sh', 'SO'],
  ['SRD', 'Surinamese Dollar', '$', 'SR'],
  ['SSP', 'South Sudanese Pound', '£', 'SS'],
  ['STN', 'São Tomé & Príncipe Dobra', 'Db', 'ST'],
  ['SYP', 'Syrian Pound', '£S', 'SY'],
  ['SZL', 'Swazi Lilangeni', 'E', 'SZ'],
  ['THB', 'Thai Baht', '฿', 'TH'],
  ['TJS', 'Tajikistani Somoni', 'SM', 'TJ'],
  ['TMT', 'Turkmenistani Manat', 'm', 'TM'],
  ['TND', 'Tunisian Dinar', 'د.ت', 'TN'],
  ['TOP', 'Tongan Paʻanga', 'T$', 'TO'],
  ['TRY', 'Turkish Lira', '₺', 'TR'],
  ['TTD', 'Trinidad & Tobago Dollar', 'TT$', 'TT'],
  ['TWD', 'New Taiwan Dollar', 'NT$', 'TW'],
  ['TZS', 'Tanzanian Shilling', 'TSh', 'TZ'],
  ['UAH', 'Ukrainian Hryvnia', '₴', 'UA'],
  ['UGX', 'Ugandan Shilling', 'USh', 'UG'],
  ['USD', 'US Dollar', '$', 'US'],
  ['UYU', 'Uruguayan Peso', '$U', 'UY'],
  ['UZS', 'Uzbekistani Som', "so'm", 'UZ'],
  ['VES', 'Venezuelan Bolívar', 'Bs.', 'VE'],
  ['VND', 'Vietnamese Dong', '₫', 'VN'],
  ['VUV', 'Vanuatu Vatu', 'VT', 'VU'],
  ['WST', 'Samoan Tala', 'T', 'WS'],
  ['XAF', 'Central African CFA Franc', 'FCFA', 'CM'],
  ['XCD', 'East Caribbean Dollar', 'EC$', 'AG'],
  ['XOF', 'West African CFA Franc', 'CFA', 'SN'],
  ['XPF', 'CFP Franc', '₣', 'PF'],
  ['YER', 'Yemeni Rial', '﷼', 'YE'],
  ['ZAR', 'South African Rand', 'R', 'ZA'],
  ['ZMW', 'Zambian Kwacha', 'ZK', 'ZM'],
  ['ZWL', 'Zimbabwean Dollar', 'Z$', 'ZW'],
];

export const AllCurrencies: Currency[] = RAW.map(([code, name, symbol, country]) => ({
  code,
  name,
  symbol,
  country,
}));

/** Shown first in the picker before the full alphabetical list. */
export const PopularCurrencyCodes = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'CAD', 'AUD', 'SGD', 'JPY'];

const byCode = new Map(AllCurrencies.map((c) => [c.code, c]));

export function getCurrency(code: string): Currency {
  return byCode.get(code) ?? { code, name: code, symbol: code, country: '' };
}

/** Regional-indicator emoji flag for an ISO 3166 country code. */
export function flagEmoji(country: string) {
  if (country === 'EU') return '🇪🇺';
  if (country.length !== 2) return '🏳️';
  return String.fromCodePoint(...[...country.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

export function searchCurrencies(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return AllCurrencies;
  return AllCurrencies.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase() === q,
  );
}
