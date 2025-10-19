// Function to extract video ID from various YouTube URL formats
function extractVideoId(url) {
    const patterns = [
        /(?:v=|\/)([0-9A-Za-z_-]{11}).*/, // Standard and shortened URLs
        /^([0-9A-Za-z_-]{11})$/ // Direct video ID
    ];

    // Try each pattern
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
}

// Function to update statistics
function updateStats(data) {
    if (!data) return;
    
    const statsDiv = document.getElementById('stats');
    const analyzedComments = data.total_comments || 0;
    const totalComments = data.total_available_comments || 0;
    
    statsDiv.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <div class="alert alert-info">
                    <h6>Comments Analysis:</h6>
                    <p><strong>Analyzed Comments:</strong> ${analyzedComments}</p>
                    <p><strong>Total Available Comments:</strong> ${totalComments}</p>
                    ${analyzedComments < totalComments ? 
                        `<p class="text-muted"><small>Note: Due to YouTube API limitations, we can analyze up to 100 comments per request.</small></p>` 
                        : ''}
                </div>
            </div>
            <div class="col-md-6">
                <div class="alert alert-success">
                    <h6>Sentiment Breakdown:</h6>
                    <p><strong>Positive Comments:</strong> ${data.sentiment_counts?.positive || 0}</p>
                    <p><strong>Neutral Comments:</strong> ${data.sentiment_counts?.neutral || 0}</p>
                    <p><strong>Negative Comments:</strong> ${data.sentiment_counts?.negative || 0}</p>
                    <p><strong>Questions:</strong> ${data.question_counts || 0}</p>
                </div>
            </div>
        </div>
    `;
}

// Function to update keywords cloud
function updateKeywordsCloud(keywords) {
    if (!keywords || Object.keys(keywords).length === 0) return;
    
    const keywordsDiv = document.getElementById('keywordsCloud');
    keywordsDiv.innerHTML = '';
    
    // Sort keywords by frequency
    const sortedKeywords = Object.entries(keywords)
        .sort((a, b) => b[1] - a[1]);
    
    // Create keyword elements with varying sizes
    const maxCount = sortedKeywords[0][1];
    const minCount = sortedKeywords[sortedKeywords.length - 1][1];
    const fontRange = 20;  // Range of font sizes (px)
    
    sortedKeywords.forEach(([word, count]) => {
        const span = document.createElement('span');
        span.textContent = word;
        
        // Calculate relative size
        const size = 14 + ((count - minCount) / (maxCount - minCount)) * fontRange;
        
        span.style.fontSize = `${size}px`;
        span.style.margin = '5px';
        span.style.display = 'inline-block';
        span.style.color = `hsl(${Math.random() * 360}, 70%, 40%)`;
        
        keywordsDiv.appendChild(span);
    });
}

// Function to update detailed sentiment table
function updateDetailedSentimentTable(detailedSentiment) {
    if (!detailedSentiment) return;
    
    const tbody = document.querySelector('#detailedSentimentTable tbody');
    tbody.innerHTML = '';
    
    detailedSentiment.forEach(item => {
        if (!item) return;
        
        const row = tbody.insertRow();
        row.insertCell().textContent = item.text || '';
        row.insertCell().textContent = ((item.pos || 0) * 100).toFixed(1) + '%';
        row.insertCell().textContent = ((item.neu || 0) * 100).toFixed(1) + '%';
        row.insertCell().textContent = ((item.neg || 0) * 100).toFixed(1) + '%';
        
        const overall = row.insertCell();
        overall.textContent = (item.compound || 0) >= 0.05 ? '😊' : (item.compound || 0) <= -0.05 ? '😞' : '😐';
    });
}

// Function to update charts
function updateCharts(data) {
    if (!data || !data.sentiment_counts) return;
    
    // Clear existing charts
    const sentimentChart = document.getElementById('sentimentChart');
    const queryChart = document.getElementById('queryChart');
    
    if (window.sentimentChartInstance) {
        window.sentimentChartInstance.destroy();
    }
    if (window.queryChartInstance) {
        window.queryChartInstance.destroy();
    }
    
    // Fix resolution before creating chart
    const sentimentCtx = fixCanvasResolution(sentimentChart);
    const queryCtx = fixCanvasResolution(queryChart);
    
    // Update sentiment distribution chart
    window.sentimentChartInstance = new Chart(sentimentCtx, {
        type: 'pie',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [
                    data.sentiment_counts.positive || 0,
                    data.sentiment_counts.neutral || 0,
                    data.sentiment_counts.negative || 0
                ],
                backgroundColor: ['#4CAF50', '#FFC107', '#F44336']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Update question distribution chart
    window.queryChartInstance = new Chart(queryCtx, {
        type: 'pie',
        data: {
            labels: ['Questions', 'Statements'],
            datasets: [{
                data: [
                    data.question_counts || 0,
                    (data.total_comments || 0) - (data.question_counts || 0)
                ],
                backgroundColor: ['#2196F3', '#9C27B0']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Function to create sentiment distribution chart
function createSentimentChart(sentiments) {
    const canvas = document.getElementById('sentimentChart');
    const ctx = fixCanvasResolution(canvas);
    
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    const neutralCount = sentiments.filter(s => s === 'neutral').length;
    const negativeCount = sentiments.filter(s => s === 'negative').length;
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [positiveCount, neutralCount, negativeCount],
                backgroundColor: ['#4CAF50', '#FFC107', '#F44336']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Sentiment Distribution'
                }
            }
        }
    });
}

// Function to create query distribution chart
function createQueryChart(queryFlags) {
    const canvas = document.getElementById('queryChart');
    const ctx = fixCanvasResolution(canvas);
    
    const questionCount = queryFlags.filter(q => q).length;
    const statementCount = queryFlags.filter(q => !q).length;
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Questions', 'Statements'],
            datasets: [{
                data: [questionCount, statementCount],
                backgroundColor: ['#2196F3', '#9C27B0']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Comment Types'
                }
            }
        }
    });
}

// Function to create length distribution chart
function createLengthChart(lengths) {
    const ctx = document.getElementById('lengthChart').getContext('2d');
    
    // Group lengths into ranges
    const ranges = {
        'Short (1-20)': 0,
        'Medium (21-50)': 0,
        'Long (51+)': 0
    };
    
    lengths.forEach(length => {
        if (length <= 20) ranges['Short (1-20)']++;
        else if (length <= 50) ranges['Medium (21-50)']++;
        else ranges['Long (51+)']++;
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(ranges),
            datasets: [{
                label: 'Number of Comments',
                data: Object.values(ranges),
                backgroundColor: '#3F51B5'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Comment Length Distribution'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Comments'
                    }
                }
            }
        }
    });
}

// Function to update video metadata
function updateVideoMetadata(metadata) {
    if (!metadata) return;
    
    // Update basic metadata
    document.getElementById('title').textContent = metadata.title;
    document.getElementById('category').textContent = metadata.category;
    document.getElementById('publishedAt').textContent = new Date(metadata.published_at).toLocaleDateString();
    document.getElementById('commentCount').textContent = metadata.total_comments;
    
    // Update thumbnail
    const thumbnailImg = document.getElementById('thumbnail');
    if (metadata.thumbnail) {
        thumbnailImg.src = metadata.thumbnail;
        thumbnailImg.style.display = 'block';
    } else {
        thumbnailImg.style.display = 'none';
    }
}

function updateLengthStats(lengthData) {
    if (!lengthData) return;

    // Update length statistics
    document.getElementById('avgLength').textContent = Math.round(lengthData.average_length);
    document.getElementById('totalChars').textContent = lengthData.total_chars.toLocaleString();
    document.getElementById('minLength').textContent = lengthData.min_length;
    document.getElementById('maxLength').textContent = lengthData.max_length;

    // Create or update length distribution chart
    const lengthChart = document.getElementById('lengthChart');
    
    if (window.lengthChartInstance) {
        window.lengthChartInstance.destroy();
    }

    const labels = {
        'very_short': '1-25 chars',
        'short': '26-50 chars',
        'medium': '51-100 chars',
        'long': '101-200 chars',
        'very_long': '200+ chars'
    };

    window.lengthChartInstance = new Chart(lengthChart.getContext('2d'), {
        type: 'bar',
        data: {
            labels: Object.values(labels),
            datasets: [{
                label: 'Number of Comments',
                data: Object.values(lengthData.distribution),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Comment Length Distribution'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Comments'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Comment Length'
                    }
                }
            }
        }
    });
}

function updateDetailedAnalysis(analyses) {
    if (!analyses || analyses.length === 0) return;
    
    const tbody = document.querySelector('#detailedAnalysisTable tbody');
    tbody.innerHTML = '';
    
    analyses.forEach(analysis => {
        const row = tbody.insertRow();
        
        // Original comment
        const commentCell = row.insertCell();
        commentCell.textContent = analysis.original;
        commentCell.style.maxWidth = '300px';
        commentCell.style.whiteSpace = 'nowrap';
        commentCell.style.overflow = 'hidden';
        commentCell.style.textOverflow = 'ellipsis';
        
        // Sentiment with emoji
        const sentimentCell = row.insertCell();
        const sentiment = analysis.sentiment.compound;
        sentimentCell.innerHTML = `
            ${sentiment >= 0.05 ? '😊' : sentiment <= -0.05 ? '😞' : '😐'}
            (${(sentiment * 100).toFixed(1)}%)
        `;
        
        // Emotions
        const emotionCell = row.insertCell();
        const emotions = Object.entries(analysis.emotions)
            .filter(([_, count]) => count > 0)
            .map(([emotion, count]) => `${emotion}: ${count}`)
            .join(', ');
        emotionCell.textContent = emotions || 'neutral';
        
        // Question
        const questionCell = row.insertCell();
        questionCell.textContent = analysis.is_question ? '❓ Yes' : 'No';
    });
}

function updateLanguageChart(languageData) {
    if (!languageData || Object.keys(languageData).length === 0) return;
    
    const ctx = document.getElementById('languageChart').getContext('2d');
    
    if (window.languageChartInstance) {
        window.languageChartInstance.destroy();
    }
    
    // Sort languages by count
    const sortedData = Object.entries(languageData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8); // Show top 8 languages
    
    const labels = sortedData.map(([lang, _]) => lang);
    const data = sortedData.map(([_, count]) => count);
    
    // Color palette for languages
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
    ];
    
    window.languageChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length)
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: {
                            size: 11
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Comment Languages'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const value = context.raw;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${percentage}% (${value} comments)`;
                        }
                    }
                }
            }
        }
    });
}

function updateQuestionStatsChart(questionStats) {
    if (!questionStats) return;
    
    const canvas = document.getElementById('queryChart');
    const ctx = fixCanvasResolution(canvas);
    
    if (window.questionStatsChartInstance) {
        window.questionStatsChartInstance.destroy();
    }
    
    const total = questionStats.questions + questionStats.statements;
    const questionPercentage = ((questionStats.questions / total) * 100).toFixed(1);
    const statementPercentage = ((questionStats.statements / total) * 100).toFixed(1);
    
    window.questionStatsChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Questions', 'Statements'],
            datasets: [{
                data: [questionStats.questions, questionStats.statements],
                backgroundColor: ['#FF9F40', '#36A2EB']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Questions vs Statements'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = context.parsed;
                            const label = context.label;
                            return `${label}: ${((value/total) * 100).toFixed(1)}% (${value} comments)`;
                        }
                    }
                }
            }
        }
    });
}

async function analyzeComments() {
    const videoInput = document.getElementById('videoId').value;
    const apiKey = document.getElementById('apiKey').value;
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    
    // Clear previous error and hide error div
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    
    // Extract video ID from URL if needed
    const videoId = extractVideoId(videoInput);
    
    if (!videoId) {
        errorDiv.textContent = 'Invalid YouTube URL or video ID';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (!apiKey) {
        errorDiv.textContent = 'Please enter your YouTube API key';
        errorDiv.style.display = 'block';
        return;
    }
    
    // Show loading message
    loadingDiv.style.display = 'block';
    loadingDiv.innerHTML = 'Analyzing comments... <div class="spinner-border spinner-border-sm" role="status"></div>';
    
    try {
        console.log('Sending request to server...');
        const response = await fetch('http://localhost:5000/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId, apiKey })
        });
        
        console.log('Received response from server');
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to analyze comments');
        }
        
        console.log('Processing response data:', data);
        
        // Hide loading message
        loadingDiv.style.display = 'none';
        
        if (!data.metadata) {
            throw new Error('No video metadata received. Please check your API key and video ID.');
        }
        
        // Update UI with new data
        updateVideoMetadata(data.metadata);
        updateStats(data);
        updateDetailedAnalysis(data.analyzed_comments);
        updateEmotionChart(data.emotion_distribution);
        updateKeywordsCloud(data.keywords);
        updateSentimentChart(data.sentiment_counts);
        updateQuestionSentimentChart(data.question_sentiment);
        updateLanguageChart(data.language_distribution);
        updateQuestionStatsChart(data.question_stats);
        updateLengthStats(data.comment_lengths);
        updateSampleComments(data.analyzed_comments);
        
        console.log('UI updates complete');
        
    } catch (error) {
        console.error('Error during analysis:', error);
        loadingDiv.style.display = 'none';
        errorDiv.textContent = `Error: ${error.message}. Please check your API key and video ID.`;
        errorDiv.style.display = 'block';
    }
}

function updateEmotionChart(emotionData) {
    if (!emotionData || Object.keys(emotionData).length === 0) return;
    
    const canvas = document.getElementById('emotionChart');
    const ctx = fixCanvasResolution(canvas);
    
    if (window.emotionChartInstance) {
        window.emotionChartInstance.destroy();
    }
    
    const emotionColors = {
        'joy': '#FFD700',
        'sadness': '#4169E1',
        'anger': '#FF4500',
        'surprise': '#32CD32',
        'fear': '#800080',
        'neutral': '#808080'
    };
    
    const labels = Object.keys(emotionData);
    const data = Object.values(emotionData);
    const colors = labels.map(label => emotionColors[label] || '#000000');
    
    window.emotionChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
            datasets: [{
                data: data,
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Emotional Distribution'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Comments'
                    }
                }
            }
        }
    });
}

function updateSentimentChart(sentimentCounts) {
    if (!sentimentCounts) return;
    
    const canvas = document.getElementById('sentimentChart');
    const ctx = fixCanvasResolution(canvas);
    
    if (window.sentimentChartInstance) {
        window.sentimentChartInstance.destroy();
    }
    
    const colors = {
        positive: '#4CAF50',
        neutral: '#FFC107',
        negative: '#F44336'
    };
    
    window.sentimentChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [
                    sentimentCounts.positive,
                    sentimentCounts.neutral,
                    sentimentCounts.negative
                ],
                backgroundColor: [colors.positive, colors.neutral, colors.negative]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                },
                title: {
                    display: true,
                    text: 'Sentiment Distribution'
                }
            }
        }
    });
}

function updateQuestionSentimentChart(questionSentiment) {
    if (!questionSentiment) return;
    
    const canvas = document.getElementById('questionSentimentChart');
    const ctx = fixCanvasResolution(canvas);
    
    if (window.questionSentimentChartInstance) {
        window.questionSentimentChartInstance.destroy();
    }
    
    window.questionSentimentChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                label: 'Questions by Sentiment',
                data: [
                    questionSentiment.positive,
                    questionSentiment.neutral,
                    questionSentiment.negative
                ],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(255, 99, 132, 0.8)'
                ],
                borderColor: [
                    'rgb(75, 192, 192)',
                    'rgb(255, 206, 86)',
                    'rgb(255, 99, 132)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Questions'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Distribution of Questions by Sentiment'
                }
            }
        }
    });
}

function updateSampleComments(comments) {
    if (!comments || comments.length === 0) return;
    
    const tbody = document.getElementById('sampleCommentsTable');
    tbody.innerHTML = '';
    
    comments.forEach(comment => {
        const row = tbody.insertRow();
        
        // Comment text
        const commentCell = row.insertCell();
        commentCell.textContent = comment.original;
        commentCell.style.maxWidth = '400px';
        commentCell.style.whiteSpace = 'normal';
        commentCell.style.wordBreak = 'break-word';
        
        // Sentiment score with color
        const sentimentCell = row.insertCell();
        const sentiment = comment.sentiment.compound;
        const sentimentColor = sentiment >= 0.05 ? '#4CAF50' : 
                             sentiment <= -0.05 ? '#F44336' : '#FFC107';
        sentimentCell.innerHTML = `
            <span style="color: ${sentimentColor}; font-weight: bold;">
                ${(sentiment * 100).toFixed(1)}%
            </span>
        `;
        
        // Emotions with badges
        const emotionCell = row.insertCell();
        const emotions = Object.entries(comment.emotions)
            .filter(([_, count]) => count > 0)
            .map(([emotion, _]) => {
                const emotionColors = {
                    'joy': '#4CAF50',
                    'sadness': '#2196F3',
                    'anger': '#F44336',
                    'fear': '#9C27B0',
                    'surprise': '#FF9800'
                };
                return `<span class="badge rounded-pill" style="background-color: ${emotionColors[emotion] || '#757575'}; margin: 0 2px;">
                    ${emotion}
                </span>`;
            })
            .join(' ');
        emotionCell.innerHTML = emotions || '<span class="text-muted">neutral</span>';
        
        // Comment type with icon
        const typeCell = row.insertCell();
        typeCell.innerHTML = comment.is_question ? 
            '<span class="badge bg-warning">❓ Question</span>' : 
            '<span class="badge bg-info">💬 Statement</span>';
        
        // Language
        const languageCell = row.insertCell();
        languageCell.textContent = comment.language.toUpperCase();
    });
}

// Helper function to fix canvas resolution for high-DPI screens
function fixCanvasResolution(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset any previous transforms
    ctx.scale(dpr, dpr);
    return ctx;
}

// Add event listener for form submission
document.getElementById('analyzeBtn').addEventListener('click', analyzeComments);
