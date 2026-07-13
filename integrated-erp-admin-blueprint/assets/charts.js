(function () {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  var readinessEl = document.getElementById('chart-readiness');
  if (readinessEl && window.echarts) {
    var readiness = echarts.init(readinessEl, null, { renderer: 'svg' });
    readiness.setOption({
      animation: false,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true },
      grid: { left: 130, right: 24, top: 18, bottom: 18, containLabel: false },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: { color: muted, fontFamily: 'IBMPlexMono' },
        splitLine: { lineStyle: { color: rule } }
      },
      yAxis: {
        type: 'category',
        data: ['Admin shell', 'RBAC base', 'Tenant scoping', 'ERP schema base', 'POS engine', 'Stock ledger depth', 'Finance & audit'],
        axisLabel: { color: ink, fontSize: 12 },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
        type: 'bar',
        data: [
          { value: 88, itemStyle: { color: accent } },
          { value: 78, itemStyle: { color: accent } },
          { value: 72, itemStyle: { color: accent } },
          { value: 68, itemStyle: { color: accent2, borderColor: accent, borderWidth: 1 } },
          { value: 24, itemStyle: { color: accent2, borderColor: accent, borderWidth: 1 } },
          { value: 21, itemStyle: { color: accent2, borderColor: accent, borderWidth: 1 } },
          { value: 18, itemStyle: { color: accent2, borderColor: accent, borderWidth: 1 } }
        ],
        label: {
          show: true,
          position: 'right',
          color: ink,
          formatter: '{c}%',
          fontFamily: 'IBMPlexMono'
        },
        barWidth: 18
      }]
    });
    window.addEventListener('resize', function () { readiness.resize(); });
  }

  var rolloutEl = document.getElementById('chart-rollout');
  if (rolloutEl && window.echarts) {
    var rollout = echarts.init(rolloutEl, null, { renderer: 'svg' });
    rollout.setOption({
      animation: false,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true },
      legend: {
        bottom: 0,
        textStyle: { color: muted, fontSize: 11, fontFamily: 'IBMPlexMono' }
      },
      grid: { left: 40, right: 20, top: 20, bottom: 60, containLabel: true },
      xAxis: {
        type: 'category',
        data: ['Wave 1', 'Wave 2', 'Wave 3', 'Wave 4'],
        axisLabel: { color: ink, fontFamily: 'IBMPlexMono' },
        axisLine: { lineStyle: { color: rule } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: muted, fontFamily: 'IBMPlexMono' },
        splitLine: { lineStyle: { color: rule } }
      },
      color: [accent, accent2, muted],
      series: [
        {
          name: 'Platform foundation',
          type: 'bar',
          stack: 'total',
          data: [6, 1, 1, 2]
        },
        {
          name: 'Retail operations',
          type: 'bar',
          stack: 'total',
          data: [0, 7, 5, 1]
        },
        {
          name: 'Governance and scale',
          type: 'bar',
          stack: 'total',
          data: [0, 0, 2, 6]
        }
      ]
    });
    window.addEventListener('resize', function () { rollout.resize(); });
  }
})();
