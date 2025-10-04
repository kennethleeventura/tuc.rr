// TUC.rr Review Scraper Service
// Real-time review aggregation from multiple sources
const axios = require('axios');
const cheerio = require('cheerio');

class ReviewScraper {
  constructor() {
    this.sources = {
      trustpilot: 'https://www.trustpilot.com/review/',
      yelp: 'https://www.yelp.com/biz/',
      google: 'https://www.google.com/search?q=',
      amazon: 'https://www.amazon.com/dp/',
      bbb: 'https://www.bbb.org/us/search?find_text=',
      consumerreports: 'https://www.consumerreports.org/search/?q=',
      glassdoor: 'https://www.glassdoor.com/Reviews/'
    };
    
    this.categoryMappings = {
      'restaurants': ['yelp', 'google', 'trustpilot'],
      'products': ['amazon', 'trustpilot', 'consumerreports'],
      'services': ['trustpilot', 'bbb', 'google'],
      'companies': ['glassdoor', 'trustpilot', 'bbb'],
      'healthcare': ['google', 'yelp', 'trustpilot'],
      'automotive': ['google', 'bbb', 'consumerreports'],
      'technology': ['trustpilot', 'amazon', 'consumerreports'],
      'retail': ['yelp', 'google', 'trustpilot']
    };
  }

  async scrapeReviews(query, category, limit = 50) {
    const sources = this.categoryMappings[category] || ['trustpilot', 'google'];
    const allReviews = [];

    for (const source of sources) {
      try {
        const reviews = await this.scrapeSource(source, query, Math.ceil(limit / sources.length));
        allReviews.push(...reviews);
      } catch (error) {
        console.error(`Failed to scrape ${source}:`, error.message);
      }
    }

    return this.processReviews(allReviews, query);
  }

  async scrapeSource(source, query, limit) {
    switch (source) {
      case 'trustpilot':
        return this.scrapeTrustpilot(query, limit);
      case 'yelp':
        return this.scrapeYelp(query, limit);
      case 'google':
        return this.scrapeGoogle(query, limit);
      default:
        return [];
    }
  }

  async scrapeTrustpilot(query, limit) {
    const searchUrl = `https://www.trustpilot.com/search?query=${encodeURIComponent(query)}`;
    
    try {
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const reviews = [];
      
      $('.review-card').slice(0, limit).each((i, element) => {
        const rating = $(element).find('[data-rating]').attr('data-rating');
        const text = $(element).find('.review-content__text').text().trim();
        const author = $(element).find('.consumer-information__name').text().trim();
        const date = $(element).find('.review-content__date').text().trim();
        
        if (text && rating) {
          reviews.push({
            source: 'trustpilot',
            rating: parseFloat(rating),
            text: text,
            author: author,
            date: date,
            verified: $(element).find('.review-content__verified').length > 0
          });
        }
      });
      
      return reviews;
    } catch (error) {
      console.error('Trustpilot scraping error:', error);
      return [];
    }
  }

  async scrapeGoogle(query, limit) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) return [];

    try {
      const searchResponse = await axios.get(`https://maps.googleapis.com/maps/api/place/textsearch/json`, {
        params: {
          query: query,
          key: apiKey
        }
      });

      const places = searchResponse.data.results.slice(0, 3);
      const reviews = [];

      for (const place of places) {
        const detailsResponse = await axios.get(`https://maps.googleapis.com/maps/api/place/details/json`, {
          params: {
            place_id: place.place_id,
            fields: 'reviews,rating',
            key: apiKey
          }
        });

        if (detailsResponse.data.result.reviews) {
          detailsResponse.data.result.reviews.slice(0, Math.ceil(limit / places.length)).forEach(review => {
            reviews.push({
              source: 'google',
              rating: review.rating,
              text: review.text,
              author: review.author_name,
              date: new Date(review.time * 1000).toISOString(),
              verified: true
            });
          });
        }
      }

      return reviews;
    } catch (error) {
      console.error('Google scraping error:', error);
      return [];
    }
  }

  processReviews(reviews, query) {
    const totalReviews = reviews.length;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
    const frownRating = Math.max(0, 5 - avgRating);
    
    const sortedReviews = reviews.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });

    return {
      query,
      totalReviews,
      avgRating: parseFloat(avgRating.toFixed(1)),
      frownRating: parseFloat(frownRating.toFixed(1)),
      reviews: sortedReviews,
      sources: [...new Set(reviews.map(r => r.source))],
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = ReviewScraper;