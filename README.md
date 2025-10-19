YouTube Comment Analyzer
A comprehensive web application that analyzes YouTube video comments using sentiment analysis, emotion detection, keyword extraction, and language detection.
Features

Sentiment Analysis: Categorizes comments as positive, negative, or neutral using VADER sentiment analysis
Emotion Detection: Identifies emotions (joy, sadness, anger, surprise, fear, neutral) in comments
Keyword Extraction: Extracts and displays the most frequently used words in comments
Language Detection: Automatically detects the language of each comment
Question Analysis: Identifies questions vs statements and their sentiment distribution
Comment Length Analysis: Provides detailed statistics on comment lengths
Video Metadata: Displays video title, category, publication date, and thumbnail
Visual Dashboard: Interactive charts and statistics for comprehensive data visualization

Prerequisites

Python 3.7 or higher
YouTube Data API v3 Key (Get it here)
Modern web browser

Installation

Clone or download this repository
Install required Python packages:

bashpip install -r requirements.txt

Get a YouTube Data API Key:

Go to Google Cloud Console
Create a new project or select an existing one
Enable the YouTube Data API v3
Create credentials (API Key)
Copy your API key



Usage

Start the Flask server:

bashpython app.py
```

2. **Open your web browser** and navigate to:
```
http://localhost:5000
```

3. **Enter your details**:
   - Paste your YouTube Data API key
   - Enter a YouTube video ID (the string after `v=` in the URL)
   - Click "Analyze Comments"

4. **View the results**: The application will display:
   - Video metadata (title, category, thumbnail)
   - Sentiment distribution
   - Emotion breakdown
   - Top keywords
   - Language distribution
   - Question vs statement analysis
   - Comment length statistics

## Project Structure
```
youtube-comment-analyzer/
├── app.py                 # Flask backend with API endpoints
├── requirements.txt       # Python dependencies
├── frontend/
│   ├── index.html        # Frontend interface
│   ├── styles.css        # Styling (if separate)
│   └── script.js         # Frontend logic (if separate)
└── README.md             # This file
API Endpoints
POST /analyze
Analyzes comments for a given YouTube video.
Request Body:
json{
  "videoId": "your_video_id",
  "apiKey": "your_api_key"
}
Response:
json{
  "metadata": {
    "title": "Video Title",
    "category": "Category Name",
    "published_at": "2024-01-01T00:00:00Z",
    "thumbnail": "thumbnail_url",
    "total_comments": 1000
  },
  "total_comments": 100,
  "sentiment_counts": {
    "positive": 60,
    "negative": 20,
    "neutral": 20
  },
  "emotion_distribution": {...},
  "keywords": {...},
  "question_sentiment": {...},
  "language_distribution": {...},
  "question_stats": {...},
  "comment_lengths": {...}
}
Dependencies

Flask: Web framework
flask-cors: Cross-origin resource sharing support
google-api-python-client: YouTube API client
vaderSentiment: Sentiment analysis
textblob: Natural language processing
emoji: Emoji handling
langdetect: Language detection

Features in Detail
Sentiment Analysis
Uses VADER (Valence Aware Dictionary and sEntiment Reasoner) to analyze the sentiment of each comment with compound scores:

Positive: score ≥ 0.05
Negative: score ≤ -0.05
Neutral: -0.05 < score < 0.05

Emotion Detection
Detects six basic emotions using keyword matching:

Joy
Sadness
Anger
Surprise
Fear
Neutral

Keyword Extraction

Removes URLs and special characters
Filters out common stop words
Returns top 20 most frequent keywords

Language Detection
Supports 50+ languages including:

English, Spanish, French, German
Hindi, Telugu, Tamil, Bengali
Chinese, Japanese, Korean
And many more

Limitations

Maximum 100 comments per analysis (can be adjusted in code)
Requires a valid YouTube Data API key
API quota limits apply (YouTube API has daily quotas)
Emotion detection uses basic keyword matching
Language detection may not be 100% accurate for very short comments

Troubleshooting
"Failed to fetch video metadata"

Verify your API key is correct
Check if the video ID is valid
Ensure the video has comments enabled
Check your API quota hasn't been exceeded

"No comments found"

The video may have comments disabled
The video may have no comments yet
API permissions may be restricted

Future Enhancements

Support for analyzing more than 100 comments
Export results to CSV/JSON
Comment reply analysis
Trend analysis over time
User engagement metrics
Advanced emotion detection using ML models

License
This project is open source and available for educational and personal use.
Contributing
Contributions, issues, and feature requests are welcome!
Acknowledgments

VADER Sentiment Analysis
YouTube Data API v3
Flask framework
All open-source libraries used in this project
