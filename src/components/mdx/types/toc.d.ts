export type TOCSection = TOCSubSection & {
  subSections: TOCSubSection[];
};

export type TOCSubSection = {
  slug: string;
  text: string;
};
