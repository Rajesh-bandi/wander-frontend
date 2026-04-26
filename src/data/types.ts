export type User = {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  coverImage: string;
  bio: string;
  location: string;
  followers: number;
  following: number;
  isPremium: boolean;
};

export type Comment = {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
};

export type Post = {
  id: string;
  authorId: string;
  image: string;
  caption: string;
  location: string;
  likes: number;
  comments: Comment[];
  createdAt: string;
};

export type Plan = {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  destination: string;
  coverImage: string;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  participantIds: string[];
  pendingRequestIds: string[];
  budget: number;
  currency: string;
  status: "upcoming" | "active" | "completed";
  isExpired?: boolean;
};

export type ProductReview = {
  id: string;
  authorId: string;
  rating: number;
  text: string;
  createdAt: string;
};

export type Product = {
  id: string;
  name: string;
  image: string;
  price: number;
  rating: number;
  reviewCount: number;
  category: string;
  description: string;
  reviews: ProductReview[];
};

export type Guide = {
  id: string;
  place: string;
  country: string;
  state: string;
  season: string;
  image: string;
  bestTimeToVisit: string;
  weather: string;
  costEstimate: string;
  tips: string[];
};

export type Message = {
  id: string;
  chatId: string;
  authorId: string;
  text: string;
  createdAt: string;
};

export type Chat = {
  id: string;
  type: "group" | "private";
  participantIds: string[];
  messages: Message[];
  planId?: string;
  requestStatus?: "pending" | "accepted" | "rejected";
};
