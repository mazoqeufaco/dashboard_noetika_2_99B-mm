/* eslint-disable no-undef */
(function(){
  if(typeof window === 'undefined' || typeof document === 'undefined'){
    return;
  }

  const TREE_LAYOUT = {
    nodeWidth: 320,
    nodePaddingY: 18,
    lineHeight: 20,
    textOffset: 22,
    verticalGap: 58,
    horizontalGap: 168,
    siblingSeparation: 1.1,
    cousinSeparation: 1.5,
    minSiblingGap: 10,
    branchRadius: 3,
    leafRadius: 6,
    margin: { top: 120, right: 280, bottom: 140, left: 280 }
  };

  const TREE_COLORS = {
    link: '#586a84',
    branchFill: '#ffffff',
    branchStroke: '#586a84',
    branchText: '#1e293b'
  };

  const TREE_NODE_STYLE = {
    root: {
      fill: '#21c999',
      stroke: '#17a97f',
      titleColor: '#052e1d',
      subtitleColor: '#0f5132',
      metaColor: '#14532d'
    },
    branch: {
      fill: '#111827',
      stroke: '#1f2937',
      titleColor: '#e2e8f0',
      subtitleColor: '#94a3b8',
      metaColor: '#64748b'
    },
    subbranch: {
      fill: '#0b1120',
      stroke: '#1e293b',
      titleColor: '#bfdbfe',
      subtitleColor: '#60a5fa',
      metaColor: '#38bdf8'
    },
    leaf: {
      fill: '#111827',
      stroke: '#1f2937',
      titleColor: '#0f172a',
      subtitleColor: '#1f2937',
      metaColor: '#27364a'
    }
  };

  function getNodeBlockHeight(){
    return TREE_LAYOUT.lineHeight;
  }

  function getNodeFill(nodeDatum){
    if(nodeDatum.data.type === 'leaf'){
      const color = nodeDatum.data.category?.color;
      if(color){
        return color;
      }
      const style = TREE_NODE_STYLE.leaf;
      return style.fill;
    }
    return TREE_COLORS.branchFill;
  }

  function getNodeStroke(nodeDatum){
    if(nodeDatum.data.type === 'leaf'){
      const stroke = nodeDatum.data.category?.stroke;
      const color = nodeDatum.data.category?.color;
      if(stroke){
        return stroke;
      }
      if(color){
        return color;
      }
      const style = TREE_NODE_STYLE.leaf;
      return style.stroke;
    }
    return TREE_COLORS.branchStroke;
  }

  function getLineFill(nodeDatum, kind){
    if(nodeDatum.data.type === 'leaf'){
      if(kind === 'title' && nodeDatum.data.category?.color){
        return '#041014';
      }
      return '#0f172a';
    }
    const style = TREE_NODE_STYLE[nodeDatum.data.type] || TREE_NODE_STYLE.branch;
    if(kind === 'title') return style.titleColor;
    if(kind === 'subtitle') return style.subtitleColor;
    return style.metaColor;
  }

  function computeLayout(root){
    const treeLayout = d3.tree()
      .nodeSize([TREE_LAYOUT.verticalGap, TREE_LAYOUT.horizontalGap])
      .separation((a, b) => (
        a.parent === b.parent
          ? TREE_LAYOUT.siblingSeparation
          : TREE_LAYOUT.cousinSeparation
      ));

    treeLayout(root);

    root.each(node => {
      node.xRender = node.x;
      node.yRender = node.y;
    });

    applyCustomSpacing(root);

    let x0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    root.each(node => {
      if(node.xRender < x0) x0 = node.xRender;
      if(node.xRender > x1) x1 = node.xRender;
      if(node.yRender > y1) y1 = node.yRender;
    });

    const height = x1 - x0 + TREE_LAYOUT.margin.top + TREE_LAYOUT.margin.bottom;
    const width = y1 + TREE_LAYOUT.nodeWidth + TREE_LAYOUT.margin.left + TREE_LAYOUT.margin.right;

    return { width, height, x0 };
  }

  function applyCustomSpacing(root){
    function shiftSubtree(node, delta){
      node.xRender += delta;
      if(node.children){
        node.children.forEach(child => shiftSubtree(child, delta));
      }
    }

    function resolve(node){
      if(!node.children || node.children.length === 0){
        return;
      }

      node.children.sort((a, b) => a.xRender - b.xRender);

      for(let i = 1; i < node.children.length; i++){
        const prev = node.children[i - 1];
        const curr = node.children[i];
        const prevBottom = prev.xRender + getNodeBlockHeight(prev) / 2 + TREE_LAYOUT.minSiblingGap;
        const currTop = curr.xRender - getNodeBlockHeight(curr) / 2;
        const overlap = prevBottom - currTop;
        if(overlap > 0){
          shiftSubtree(curr, overlap + 2);
        }
      }

      node.children.forEach(resolve);

      const mid = (node.children[0].xRender + node.children[node.children.length - 1].xRender) / 2;
      if(Number.isFinite(mid)){
        node.xRender = mid;
      }
    }

    resolve(root);
  }

  function formatNodeLabel(nodeDatum){
    const data = nodeDatum.data || {};

    if(data.type === 'leaf'){
      const parts = [];
      if(data.title) parts.push(data.title);
      if(data.subtitle) parts.push(`(${data.subtitle})`);
      return parts.join(' ').trim();
    }

    if(nodeDatum.depth === 0){
      return 'Seu problema';
    }

    return data.title || '';
  }

  function getTextFill(nodeDatum){
    if(nodeDatum.data.type === 'leaf'){
      return getNodeFill(nodeDatum);
    }
    return '#f8fafc';
  }

  function renderLegend(host, categories){
    if(!categories?.length) return;

    const legend = document.createElement('div');
    legend.className = 'tree-legend';

    const header = document.createElement('div');
    header.className = 'tree-legend-header';
    header.textContent = 'Legenda:';
    legend.appendChild(header);

    categories.forEach(cat=>{
      const entry = document.createElement('div');
      entry.className = 'tree-legend-item';

      const swatch = document.createElement('span');
      swatch.className = 'tree-legend-swatch';
      swatch.style.background = cat.color;
      swatch.style.borderColor = cat.stroke;

      const copy = document.createElement('div');
      copy.className = 'tree-legend-copy';

      const title = document.createElement('div');
      title.className = 'tree-legend-title';
      title.textContent = cat.title;

      const description = document.createElement('div');
      description.className = 'tree-legend-description';
      description.textContent = cat.description;

      copy.appendChild(title);
      copy.appendChild(description);
      entry.appendChild(swatch);
      entry.appendChild(copy);
      legend.appendChild(entry);
    });

    host.appendChild(legend);
  }

  window.renderMindmap = function renderMindmap(selector, hierarchy, categories, decimals){
    if(typeof d3 === 'undefined'){
      console.warn('D3 não carregado - impossível renderizar árvore.');
      return;
    }

    const host = document.querySelector(selector);
    if(!host){
      return;
    }

    host.innerHTML = '';

    const root = d3.hierarchy(hierarchy);
    const layout = computeLayout(root);

    const svg = d3.select(host)
      .append('svg')
      .attr('viewBox', `0 0 ${layout.width} ${layout.height}`)
      .attr('preserveAspectRatio', 'xMidYMin meet')
      .style('width', '100%')
      .style('height', 'auto');

    const g = svg.append('g')
      .attr('transform', `translate(${TREE_LAYOUT.margin.left},${TREE_LAYOUT.margin.top - layout.x0})`);

    g.append('g')
      .attr('fill', 'none')
      .attr('stroke', TREE_COLORS.link)
      .attr('stroke-width', 1.8)
      .attr('stroke-opacity', 0.85)
      .selectAll('path')
      .data(root.links())
      .join('path')
      .attr('class', 'tree-link')
      .attr('d', d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x)
      );

    const nodes = g.append('g')
      .selectAll('g')
      .data(root.descendants())
      .join('g')
      .attr('class', d => `tree-node tree-node-${d.data.type || 'branch'}`)
      .attr('transform', d => `translate(${d.yRender},${d.xRender})`);

    nodes.append('circle')
      .attr('r', d => d.data.type === 'leaf' ? TREE_LAYOUT.leafRadius : TREE_LAYOUT.branchRadius)
      .attr('fill', d => getNodeFill(d))
      .attr('stroke', d => getNodeStroke(d))
      .attr('stroke-width', d => d.data.type === 'leaf' ? 2 : 1.4)
      .attr('opacity', d => d.data.type === 'leaf' ? 0.98 : 1);

    nodes.each(function(nodeDatum){
      const isLeaf = nodeDatum.data.type === 'leaf';
      const textGroup = d3.select(this)
        .append('g')
        .attr('class', `tree-node-text tree-node-text-${nodeDatum.data.type || 'branch'}`)
        .attr('transform', `translate(${isLeaf ? TREE_LAYOUT.textOffset : -TREE_LAYOUT.textOffset},0)`);

      const label = formatNodeLabel(nodeDatum) || '';

      textGroup.append('text')
        .attr('class', `tree-node-title tree-node-label tree-node-label-${nodeDatum.data.type || 'branch'}`)
        .attr('x', 0)
        .attr('y', 0)
        .attr('text-anchor', isLeaf ? 'start' : 'end')
        .attr('alignment-baseline', 'middle')
        .attr('fill', getTextFill(nodeDatum))
        .text(label);
    });

    const leafNodes = nodes.filter(d => d.data.type === 'leaf' && d.data.raw);

    function triggerLeafDetail(d){
      const raw = d.data.raw || {};
      const coord = raw.coordStr || raw.coordOriginal || d.data.subtitle || '';
      const solutionName = raw.nome || raw.nome_curto || d.data.title || '';
      const externalLink = raw.link || raw.url || raw.href;
      const linkTarget = raw.linkTarget || raw.target || '_blank';

      console.debug('[Mindmap] Leaf clicked', {
        solutionName,
        coord,
        hasExternalLink: Boolean(externalLink),
        raw
      });

      if(externalLink){
        const target = typeof linkTarget === 'string' ? linkTarget : '_blank';
        try{
          window.open(externalLink, target, 'noopener');
          return;
        }catch(err){
          console.warn('[Mindmap] window.open failed, fallback to location', err);
          window.location.href = externalLink;
          return;
        }
      }

      if(typeof window.showSolutionModal === 'function'){
        console.debug('[Mindmap] Calling showSolutionModal', { solutionName, coord });
        window.showSolutionModal(solutionName, coord);
      } else {
        console.warn('[Mindmap] showSolutionModal is not defined on window');
      }
    }

    leafNodes
      .attr('role', 'button')
      .attr('tabindex', 0)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        triggerLeafDetail(d);
      })
      .on('keydown', (event, d) => {
        if(event.key === 'Enter' || event.key === ' '){
          event.preventDefault();
          event.stopPropagation();
          triggerLeafDetail(d);
        }
      })
      .append('title')
      .text(d => [d.data.title, d.data.subtitle, d.data.meta].filter(Boolean).join('\n'));

    const leafTexts = leafNodes.selectAll('.tree-node-text text');

    leafTexts
      .attr('pointer-events', 'auto')
      .style('cursor', 'pointer')
      .style('text-decoration', 'underline')
      .on('click', (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        triggerLeafDetail(d);
      });

    leafTexts
      .on('mouseenter', function(){
        d3.select(this).style('opacity', 0.85);
      })
      .on('mouseleave', function(){
        d3.select(this).style('opacity', 1);
      });

    renderLegend(host, categories);
  };
})();

