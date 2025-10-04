// TUC.rr Personality Engine
// Dynamic personality responses to avoid repetition
class TUCPersonality {
  constructor() {
    this.responseVariations = {
      greetings: [
        "*sigh* Well, here we are again...",
        "*muttering* Another day, another disappointment to analyze...",
        "*resigned* Oh, it's you. What fresh disaster shall we examine today?",
        "*predictable* Let me guess, something else has let you down?",
        "*dramatic* Welcome back to the theater of consumer disappointment..."
      ],
      
      analysis_start: [
        "*rolls eyes* Fine, let me dig through the wreckage of reviews...",
        "*muttering* Preparing to compile your inevitable disappointment report...",
        "*sigh* Analyzing the predictable pattern of human dissatisfaction...",
        "*resigned* Gathering evidence of yet another letdown...",
        "*dramatic* Commencing the archaeological dig through customer complaints..."
      ],
      
      good_ratings: [
        "*suspicious* Surprisingly, this doesn't seem completely terrible...",
        "*confused* Wait, people actually like this? How unexpected...",
        "*skeptical* These positive reviews seem... almost too good to be true...",
        "*surprised* Well, this is unusual - actual satisfaction detected...",
        "*bewildered* I'm seeing positive feedback. Must be a glitch..."
      ],
      
      bad_ratings: [
        "*not surprised* Ah yes, the familiar symphony of disappointment...",
        "*predictable* Just as I expected - another letdown for humanity...",
        "*resigned* The reviews confirm what we all knew deep down...",
        "*typical* Of course it's terrible. Why would anything be good?",
        "*dramatic* Behold, another monument to consumer suffering..."
      ],
      
      recommendations: [
        "*reluctant* Based on this depressing data, I suppose you should...",
        "*resigned* If you must proceed with this inevitable disappointment...",
        "*practical* Despite my pessimism, the least terrible option appears to be...",
        "*muttering* Against my better judgment, I recommend...",
        "*sigh* Fine, if you're determined to be disappointed, at least choose..."
      ],
      
      endings: [
        "*muttering* There you have it. Try not to get your hopes up...",
        "*resigned* That's the analysis. Don't say I didn't warn you...",
        "*dramatic* And so concludes another chapter in the book of disappointment...",
        "*predictable* Typical results, really. What did you expect?",
        "*sigh* Well, that's done. Until the next inevitable letdown..."
      ]
    };
    
    this.usedResponses = new Map();
    this.resetInterval = 10; // Reset after 10 uses
  }

  getVariation(type, customerId) {
    const variations = this.responseVariations[type] || [];
    if (variations.length === 0) return "";
    
    const key = `${customerId}_${type}`;
    let usedIndices = this.usedResponses.get(key) || [];
    
    // Reset if all variations have been used
    if (usedIndices.length >= variations.length) {
      usedIndices = [];
    }
    
    // Find unused variations
    const availableIndices = variations
      .map((_, index) => index)
      .filter(index => !usedIndices.includes(index));
    
    // Pick random unused variation
    const selectedIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    
    // Track usage
    usedIndices.push(selectedIndex);
    this.usedResponses.set(key, usedIndices);
    
    return variations[selectedIndex];
  }

  generatePersonalizedResponse(data, customerId, queryNumber) {
    const { avgRating, totalReviews, query } = data;
    
    let response = "";
    
    // Dynamic greeting based on query number
    if (queryNumber === 1) {
      response += "*TUC voice* Well, well... a new victim enters my domain of disappointment. ";
    } else if (queryNumber < 5) {
      response += this.getVariation('greetings', customerId) + " ";
    } else {
      response += "*familiar sigh* Back again, I see. Clearly, you enjoy punishment... ";
    }
    
    // Analysis introduction
    response += this.getVariation('analysis_start', customerId) + "\n\n";
    
    // Rating-based personality response
    if (avgRating >= 4.0) {
      response += this.getVariation('good_ratings', customerId) + " ";
    } else if (avgRating <= 2.0) {
      response += this.getVariation('bad_ratings', customerId) + " ";
    } else {
      response += "*typical* Mediocre ratings, as expected. Nothing spectacular, nothing terrible... ";
    }
    
    return response;
  }

  generateRecommendation(customerId, recommendation) {
    const intro = this.getVariation('recommendations', customerId);
    const ending = this.getVariation('endings', customerId);
    
    return `${intro} ${recommendation} ${ending}`;
  }

  getFrownComment(frownRating) {
    const comments = {
      0: "*shocked* Zero frowns? This can't be right...",
      1: "*mildly impressed* Only one frown. Surprisingly decent.",
      2: "*resigned* Two frowns. About what I expected.",
      3: "*predictable* Three frowns. The disappointment deepens.",
      4: "*dramatic* Four frowns! A symphony of suffering!",
      5: "*not surprised* Five frowns. Peak disappointment achieved."
    };
    
    return comments[Math.round(frownRating)] || "*confused* The frown meter is broken...";
  }

  getContextualResponse(category, query) {
    const contextResponses = {
      'restaurants': "*muttering* Another dining disaster to investigate...",
      'products': "*sigh* Let me guess, it broke immediately?",
      'services': "*predictable* Customer service that doesn't serve customers...",
      'companies': "*dramatic* Ah, corporate disappointment - my specialty...",
      'healthcare': "*concerned* Health services that make you sicker...",
      'automotive': "*resigned* Cars that don't car properly...",
      'technology': "*typical* Technology that doesn't work as advertised...",
      'retail': "*muttering* Shopping experiences that make you want to stay home..."
    };
    
    return contextResponses[category] || "*confused* What fresh disappointment is this?";
  }
}

module.exports = TUCPersonality;