import Confirm from '/admin/js/confirm.js';

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Confirm Modal
    const confirmModal = new Confirm();
    const disableAllBtn = document.getElementById('disableAllAnalytics');

    if (disableAllBtn) {
        disableAllBtn.addEventListener('click', async () => {
            const isConfirmed = await confirmModal.open({
                title: 'Ուշադրություն',
                message: 'Դուք պատրաստվում եք անջատել անալիտիկան ԲՈԼՈՐ ուսանողների համար։ Շարունակե՞լ։',
                okText: 'Այո, անջատել',
                cancelText: 'Չեղարկել',
                okClass: 'btn-danger'
            });

            if (isConfirmed) {
                try {
                    const response = await fetch('/admin/users/bulk-toggle-analytics', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ include: false })
                    });
                    const data = await response.json();
                    if (data.success) {
                        window.location.reload();
                    } else {
                        throw new Error('Failed');
                    }
                } catch (e) {
                    alert('Սխալ տեղի ունեցավ');
                }
            }
        });
    }

    // Data from Server
    let chartData, kpi;
    const dataEl = document.getElementById('dashboard-data');
    
    if (dataEl) {
        try {
            chartData = JSON.parse(dataEl.dataset.chart);
            kpi = JSON.parse(dataEl.dataset.kpi);
        } catch (e) {
            console.error('Failed to parse dashboard data');
        }
    }

    if (chartData && kpi) {
        // Growth Chart
        const growthChartEl = document.getElementById('growthChart');
        if (growthChartEl) {
            const ctxGrowth = growthChartEl.getContext('2d');
            
            // Create gradient for improving
            const gradientImproving = ctxGrowth.createLinearGradient(0, 0, 0, 300);
            gradientImproving.addColorStop(0, 'rgba(25, 135, 84, 0.2)');
            gradientImproving.addColorStop(1, 'rgba(25, 135, 84, 0.0)');

            const growthChart = new Chart(ctxGrowth, {
                type: 'line',
                data: {
                    labels: chartData.labels,
                    datasets: [
                        {
                            label: 'Բարելավվող',
                            data: chartData.improving,
                            borderColor: '#198754', // Success
                            backgroundColor: gradientImproving,
                            borderWidth: 2,
                            tension: 0.4,
                            pointRadius: 0, // Clean look
                            pointHoverRadius: 6,
                            fill: true,
                            spanGaps: true
                        },
                        {
                            label: 'Կայուն',
                            data: chartData.stagnant,
                            borderColor: '#ffc107', // Warning
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            fill: false,
                            borderDash: [5, 5],
                            spanGaps: true
                        },
                        {
                            label: 'Ռիսկային',
                            data: chartData.risk,
                            borderColor: '#dc3545', // Danger
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            fill: false,
                            spanGaps: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: { 
                            display: false // Hide default legend
                        },
                        tooltip: { 
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            titleColor: '#000',
                            bodyColor: '#000',
                            borderColor: '#ddd',
                            borderWidth: 1,
                            padding: 10,
                            displayColors: true
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            grid: { borderDash: [2, 4], color: '#f0f0f0' },
                            ticks: { padding: 10, color: '#999' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { 
                                maxTicksLimit: 10,
                                color: '#999'
                            }
                        }
                    }
                }
            });

            // Generate Custom Legend
            const legendContainer = document.getElementById('growthLegend');
            if (legendContainer) {
                growthChart.data.datasets.forEach((dataset, index) => {
                    const btn = document.createElement('button');
                    btn.className = 'btn btn-sm rounded-pill d-flex align-items-center gap-2 border';
                    btn.style.fontSize = '0.85rem';
                    btn.style.backgroundColor = '#fff';
                    btn.style.color = '#6c757d';
                    
                    // Color indicator
                    const dot = document.createElement('span');
                    dot.style.width = '10px';
                    dot.style.height = '10px';
                    dot.style.borderRadius = '50%';
                    dot.style.backgroundColor = dataset.borderColor;
                    dot.style.display = 'inline-block';
                    
                    btn.appendChild(dot);
                    btn.appendChild(document.createTextNode(dataset.label));

                    // Toggle function
                    btn.onclick = () => {
                        const isHidden = !growthChart.isDatasetVisible(index);
                        growthChart.setDatasetVisibility(index, isHidden);
                        growthChart.update();
                        
                        // Update visual state
                        if (isHidden) {
                            btn.style.opacity = '1';
                            btn.classList.remove('text-decoration-line-through');
                        } else {
                            btn.style.opacity = '0.5';
                            btn.classList.add('text-decoration-line-through');
                        }
                    };

                    legendContainer.appendChild(btn);
                });
            }
        }

        // Status Donut Chart
        const statusChartEl = document.getElementById('statusChart');
        if (statusChartEl) {
            const ctxStatus = statusChartEl.getContext('2d');
            new Chart(ctxStatus, {
                type: 'doughnut',
                data: {
                    labels: ['Բարելավվող', 'Կայուն', 'Ռիսկային'],
                    datasets: [{
                        data: [kpi.improving, kpi.stagnant, kpi.risk],
                        backgroundColor: ['#198754', '#ffc107', '#dc3545'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    }

    // Analytics Toggle
    document.querySelectorAll('.analytics-toggle').forEach(toggle => {
        toggle.addEventListener('change', async function() {
            const userId = this.getAttribute('data-user-id');
            const include = this.checked;
            
            try {
                const response = await fetch(`/admin/users/${userId}/toggle-analytics`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ include })
                });
                const data = await response.json();
                if (!data.success) throw new Error('Toggle failed');
            } catch (e) {
                this.checked = !include; // Revert on error
                alert('Սխալ տեղի ունեցավ: Կրկին փորձեք');
            }
        });
    });

    // Server-side Search and Filter
    const searchInput = document.getElementById('studentSearch');
    const statusFilter = document.getElementById('statusFilter');

    const updateParams = () => {
        const search = searchInput.value;
        const status = statusFilter.value;
        const url = new URL(window.location.href);
        url.searchParams.set('search', search);
        url.searchParams.set('status', status);
        url.searchParams.set('page', 1); // Reset to page 1
        window.location.href = url.toString();
    };

    if(searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                updateParams();
            }
        });
    }
    
    if(statusFilter) {
        statusFilter.addEventListener('change', updateParams);
    }
});
