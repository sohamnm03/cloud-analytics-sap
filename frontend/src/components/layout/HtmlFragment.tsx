type HtmlFragmentProps = {
  html: string;
};

export function HtmlFragment({ html }: HtmlFragmentProps) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
