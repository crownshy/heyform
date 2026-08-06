import parse, { domToReact, Element, HTMLReactParserOptions } from 'html-react-parser'
import { FC, createElement } from 'react'

import { InlineTooltip } from './InlineTooltip'

export interface HtmlContentProps {
  html: string
  className?: string
  // The wrapping tag, e.g. 'h1' for a question title or 'div' for a description.
  as?: keyof JSX.IntrinsicElements
}

function hasClass(node: Element, className: string) {
  return node.attribs?.class?.split(/\s+/).includes(className) ?? false
}

// Rich-text content is authored as an HTML string and may contain inline
// "tooltip" terms: <span class="heyform-tooltip" data-tooltip="definition">term</span>.
// We parse the HTML (instead of dangerouslySetInnerHTML) so those spans can be
// swapped for the <InlineTooltip>, which portals out of overflow containers and
// flips to fit inside the viewport — everything else renders unchanged.
const options: HTMLReactParserOptions = {
  replace: domNode => {
    if (!(domNode instanceof Element) || domNode.name !== 'span') {
      return
    }

    if (!hasClass(domNode, 'heyform-tooltip')) {
      return
    }

    const definition = domNode.attribs['data-tooltip']

    // No definition — fall back to default rendering of the span.
    if (!definition) {
      return
    }

    return (
      <InlineTooltip definition={definition}>
        {domToReact(domNode.children as any, options)}
      </InlineTooltip>
    )
  }
}

export const HtmlContent: FC<HtmlContentProps> = ({ html, className, as = 'div' }) => {
  return createElement(as, { className }, parse(html, options))
}
