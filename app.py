from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from googleapiclient.discovery import build
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import re
from collections import Counter
from textblob import TextBlob
import emoji
from collections import defaultdict
from langdetect import detect

app = Flask(__name__)
CORS(app)

def get_youtube_comments(video_id, api_key, max_results=100):
    """Fetch comments from YouTube API"""
    youtube = build('youtube', 'v3', developerKey=api_key)
    
    try:
        # Get video comments
        request = youtube.commentThreads().list(
            part='snippet',
            videoId=video_id,
            maxResults=max_results,
            textFormat='plainText'
        )
        response = request.execute()
        
        # Extract comment texts
        comments = []
        for item in response.get('items', []):
            comment = item['snippet']['topLevelComment']['snippet']['textDisplay']
            comments.append(comment)
            
        return comments
        
    except Exception as e:
        raise Exception(f"Failed to fetch YouTube comments: {str(e)}")

def analyze_sentiment(comment):
    """Analyze sentiment of a comment using VADER"""
    analyzer = SentimentIntensityAnalyzer()
    sentiment_scores = analyzer.polarity_scores(comment)
    
    # Determine sentiment based on compound score
    if sentiment_scores['compound'] >= 0.05:
        return 'positive'
    elif sentiment_scores['compound'] <= -0.05:
        return 'negative'
    else:
        return 'neutral'

def is_question(comment):
    """Check if comment is a question"""
    # Simple check for question marks or question words
    question_words = ['what', 'when', 'where', 'who', 'why', 'how']
    comment_lower = comment.lower()
    return ('?' in comment) or any(comment_lower.startswith(word) for word in question_words)

def get_comment_length(comment):
    """Get number of words in comment"""
    return len(comment.split())

def extract_keywords(comments, top_n=20):
    # Combine all comments
    text = ' '.join(comments)
    
    # Remove URLs
    text = re.sub(r'http\S+|www.\S+', '', text)
    
    # Remove special characters and convert to lowercase
    text = re.sub(r'[^\w\s]', '', text.lower())
    
    # Split into words
    words = text.split()
    
    # Remove stopwords
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
    words = [word for word in words if word not in stop_words and len(word) > 2]
    
    # Count word frequencies
    word_freq = Counter(words)
    
    # Get top N keywords
    return dict(word_freq.most_common(top_n))

def is_question(text):
    # Check for question marks
    if '?' in text:
        return True
    
    # Check for question words at the start
    question_starters = {'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how'}
    first_word = text.lower().split()[0] if text else ''
    
    return first_word in question_starters

def get_detailed_sentiment(analyzer, comments):
    detailed_scores = []
    for comment in comments:
        scores = analyzer.polarity_scores(comment)
        detailed_scores.append({
            'text': comment[:100] + '...' if len(comment) > 100 else comment,
            'compound': scores['compound'],
            'pos': scores['pos'],
            'neu': scores['neu'],
            'neg': scores['neg']
        })
    return detailed_scores

def calculate_sentiment_counts(detailed_sentiment):
    counts = {'positive': 0, 'negative': 0, 'neutral': 0}
    for sentiment in detailed_sentiment:
        if sentiment['compound'] >= 0.05:
            counts['positive'] += 1
        elif sentiment['compound'] <= -0.05:
            counts['negative'] += 1
        else:
            counts['neutral'] += 1
    return counts

def calculate_comment_lengths(comments):
    lengths = []
    length_distribution = {
        'very_short': 0,  # 1-25 chars
        'short': 0,      # 26-50 chars
        'medium': 0,     # 51-100 chars
        'long': 0,       # 101-200 chars
        'very_long': 0   # 200+ chars
    }
    total_chars = 0
    
    for comment in comments:
        length = len(comment)
        lengths.append(length)
        total_chars += length
        
        if length <= 25:
            length_distribution['very_short'] += 1
        elif length <= 50:
            length_distribution['short'] += 1
        elif length <= 100:
            length_distribution['medium'] += 1
        elif length <= 200:
            length_distribution['long'] += 1
        else:
            length_distribution['very_long'] += 1
    
    return {
        'individual_lengths': lengths,
        'distribution': length_distribution,
        'average_length': total_chars / len(comments) if comments else 0,
        'max_length': max(lengths) if lengths else 0,
        'min_length': min(lengths) if lengths else 0,
        'total_chars': total_chars
    }

def calculate_question_counts(comments):
    counts = 0
    for comment in comments:
        if is_question(comment):
            counts += 1
    return counts

def get_video_metadata(youtube, video_id):
    try:
        response = youtube.videos().list(
            part='snippet,statistics',
            id=video_id
        ).execute()

        if not response.get('items'):
            print(f"No video found for ID: {video_id}")
            return None

        video = response['items'][0]
        snippet = video['snippet']
        statistics = video['statistics']

        return {
            'title': snippet.get('title', 'Untitled'),
            'category': snippet.get('categoryId', 'Unknown'),
            'published_at': snippet.get('publishedAt', ''),
            'thumbnail': snippet.get('thumbnails', {}).get('medium', {}).get('url', ''),
            'total_comments': statistics.get('commentCount', 0)
        }
    except Exception as e:
        print(f"Error fetching video metadata: {str(e)}")
        return None

def get_youtube_comments(youtube, video_id, max_results=100):
    try:
        comments = []
        request = youtube.commentThreads().list(
            part='snippet',
            videoId=video_id,
            maxResults=min(max_results, 100),
            textFormat='plainText'
        )

        while request and len(comments) < max_results:
            response = request.execute()
            
            for item in response.get('items', []):
                comment = item['snippet']['topLevelComment']['snippet'].get('textDisplay', '')
                if comment:  # Only add non-empty comments
                    comments.append(comment)
            
            # Get the next page of comments
            request = youtube.commentThreads().list_next(request, response)
            
            if not request:
                break
                
        print(f"Retrieved {len(comments)} comments successfully")
        return comments
    except Exception as e:
        print(f"Error fetching comments: {str(e)}")
        return []

def detect_emotions(text):
    # Basic emotion keywords
    emotion_keywords = {
        'joy': ['happy', 'great', 'awesome', 'excellent', 'love', 'wonderful', 'fantastic', '😊', '😄', '❤️'],
        'sadness': ['sad', 'disappointed', 'unhappy', 'miss', 'crying', 'terrible', '😢', '😭', '😔'],
        'anger': ['angry', 'mad', 'hate', 'furious', 'annoying', 'terrible', '😠', '😡', '🤬'],
        'surprise': ['wow', 'omg', 'incredible', 'amazing', 'unbelievable', '😮', '😲', '😱'],
        'fear': ['scared', 'afraid', 'worried', 'terrifying', 'scary', '😨', '😰', '😱'],
        'neutral': ['okay', 'fine', 'alright', 'normal', 'ok', '😐', '🤔']
    }
    
    text = text.lower()
    emotions = defaultdict(int)
    
    # Check for emotion keywords and emojis
    for emotion, keywords in emotion_keywords.items():
        for keyword in keywords:
            if keyword in text:
                emotions[emotion] += 1
    
    # If no emotions detected, mark as neutral
    if not emotions:
        emotions['neutral'] = 1
    
    return dict(emotions)

def detect_language(text):
    try:
        return detect(text)
    except:
        return 'unknown'

def analyze_comment(comment):
    try:
        # Basic sentiment analysis
        analyzer = SentimentIntensityAnalyzer()
        sentiment = analyzer.polarity_scores(comment)
        
        # Detect language
        language = detect_language(comment)
        
        # Detect emotions
        emotions = detect_emotions(comment)
        
        # Check if comment is a question
        is_question_comment = is_question(comment)
        
        return {
            'original': comment,
            'language': language,
            'sentiment': sentiment,
            'emotions': emotions,
            'is_question': is_question_comment
        }
    except Exception as e:
        print(f"Error analyzing single comment: {str(e)}")
        return None

# YouTube category ID to name mapping
CATEGORY_MAPPING = {
    '1': 'Film & Animation',
    '2': 'Autos & Vehicles',
    '10': 'Music',
    '15': 'Pets & Animals',
    '17': 'Sports',
    '19': 'Travel & Events',
    '20': 'Gaming',
    '22': 'People & Blogs',
    '23': 'Comedy',
    '24': 'Entertainment',
    '25': 'News & Politics',
    '26': 'Howto & Style',
    '27': 'Education',
    '28': 'Science & Technology',
    '29': 'Nonprofits & Activism'
}

# Language code to full name mapping
LANGUAGE_MAPPING = {
    'af': 'Afrikaans',
    'ar': 'Arabic',
    'bg': 'Bulgarian',
    'bn': 'Bengali',
    'ca': 'Catalan',
    'cs': 'Czech',
    'cy': 'Welsh',
    'da': 'Danish',
    'de': 'German',
    'el': 'Greek',
    'en': 'English',
    'es': 'Spanish',
    'et': 'Estonian',
    'fa': 'Persian',
    'fi': 'Finnish',
    'fr': 'French',
    'gu': 'Gujarati',
    'he': 'Hebrew',
    'hi': 'Hindi',
    'hr': 'Croatian',
    'hu': 'Hungarian',
    'id': 'Indonesian',
    'it': 'Italian',
    'ja': 'Japanese',
    'kn': 'Kannada',
    'ko': 'Korean',
    'lt': 'Lithuanian',
    'lv': 'Latvian',
    'mk': 'Macedonian',
    'ml': 'Malayalam',
    'mr': 'Marathi',
    'ne': 'Nepali',
    'nl': 'Dutch',
    'no': 'Norwegian',
    'pa': 'Punjabi',
    'pl': 'Polish',
    'pt': 'Portuguese',
    'ro': 'Romanian',
    'ru': 'Russian',
    'sk': 'Slovak',
    'sl': 'Slovenian',
    'so': 'Somali',
    'sq': 'Albanian',
    'sv': 'Swedish',
    'sw': 'Swahili',
    'ta': 'Tamil',
    'te': 'Telugu',
    'th': 'Thai',
    'tl': 'Tagalog',
    'tr': 'Turkish',
    'uk': 'Ukrainian',
    'ur': 'Urdu',
    'vi': 'Vietnamese',
    'zh-cn': 'Chinese (Simplified)',
    'zh-tw': 'Chinese (Traditional)',
    'unknown': 'Unknown'
}

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        print("Starting analysis...")
        data = request.get_json()
        
        if not data:
            print("No JSON data received")
            return jsonify({'error': 'No data received'}), 400
            
        video_id = data.get('videoId')
        api_key = data.get('apiKey')
        
        print(f"Received request for video ID: {video_id}")
        
        if not video_id or not api_key:
            print("Missing video ID or API key")
            return jsonify({'error': 'Video ID and API key are required'}), 400
            
        # Initialize the YouTube API client
        print("Initializing YouTube API client...")
        youtube = build('youtube', 'v3', developerKey=api_key)
        
        # Get video metadata
        print("Fetching video metadata...")
        metadata = get_video_metadata(youtube, video_id)
        if not metadata:
            print("Failed to fetch metadata")
            return jsonify({'error': 'Failed to fetch video metadata. Please check your API key and video ID.'}), 400
            
        metadata['category'] = CATEGORY_MAPPING.get(metadata.get('category', 'Unknown'), 'Unknown')
        print("Successfully fetched metadata")
        
        # Get comments
        print("Fetching comments...")
        comments = get_youtube_comments(youtube, video_id)
        if not comments:
            print("No comments found")
            return jsonify({'error': 'No comments found or failed to fetch comments'}), 400
            
        print(f"Retrieved {len(comments)} comments")
        
        # Extract keywords
        print("Extracting keywords...")
        keywords = extract_keywords(comments)
        
        # Analyze each comment
        print("Analyzing comments...")
        comment_analyses = []
        sentiment_counts = {'positive': 0, 'negative': 0, 'neutral': 0}
        emotion_stats = defaultdict(int)
        question_sentiment = {'positive': 0, 'negative': 0, 'neutral': 0}
        language_stats = defaultdict(int)
        question_stats = {'questions': 0, 'statements': 0}
        
        for comment in comments:
            if not isinstance(comment, str):
                print(f"Skipping invalid comment type: {type(comment)}")
                continue
                
            analysis = analyze_comment(comment)
            if analysis:
                comment_analyses.append(analysis)
                
                # Update sentiment counts
                sentiment = analysis['sentiment']['compound']
                if sentiment >= 0.05:
                    sentiment_counts['positive'] += 1
                    if analysis['is_question']:
                        question_sentiment['positive'] += 1
                elif sentiment <= -0.05:
                    sentiment_counts['negative'] += 1
                    if analysis['is_question']:
                        question_sentiment['negative'] += 1
                else:
                    sentiment_counts['neutral'] += 1
                    if analysis['is_question']:
                        question_sentiment['neutral'] += 1
                
                # Update emotion stats
                for emotion, count in analysis['emotions'].items():
                    emotion_stats[emotion] += count
                    
                # Update language stats with full names
                if 'language' in analysis:
                    lang_code = analysis['language'].lower()
                    lang_name = LANGUAGE_MAPPING.get(lang_code, 'Other')
                    language_stats[lang_name] += 1
                    
                # Update question stats
                if analysis['is_question']:
                    question_stats['questions'] += 1
                else:
                    question_stats['statements'] += 1
        
        print("Analysis complete, preparing response...")
        
        response_data = {
            'metadata': metadata,
            'total_comments': len(comments),
            'total_available_comments': int(metadata.get('total_comments', 0)),
            'sentiment_counts': sentiment_counts,
            'emotion_distribution': dict(emotion_stats),
            'keywords': keywords,
            'question_sentiment': question_sentiment,
            'language_distribution': dict(language_stats),
            'question_stats': question_stats,
            'analyzed_comments': comment_analyses[:10],  # Return first 10 detailed analyses
            'comment_lengths': calculate_comment_lengths(comments)
        }
        
        print("Sending response...")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error in analyze endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/')
def serve_frontend():
    return send_from_directory('frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('frontend', path)

if __name__ == '__main__':
    app.run(debug=True)