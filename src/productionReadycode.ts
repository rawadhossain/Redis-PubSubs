import { createClient, RedisClientType } from "redis";

export class PubSubManager {
	private static instance: PubSubManager;
	private subClient: RedisClientType;
	private subscriptions: Map<string, Set<string>>;

	private constructor() {
		this.subClient = createClient({ url: process.env.REDIS_URL });
		this.subClient.on("error", (e) => console.error("Redis error:", e));
		this.subClient.on("ready", () => console.log("Redis ready"));
		this.subscriptions = new Map();
	}

	public static async getInstance(): Promise<PubSubManager> {
		if (!this.instance) {
			this.instance = new PubSubManager();
			await this.instance.subClient.connect();
		}
		return this.instance;
	}

	public async userSubscribe(userId: string, stock: string) {
		let set = this.subscriptions.get(stock);
		if (!set) {
			set = new Set();
			this.subscriptions.set(stock, set);
		}
		const before = set.size;
		set.add(userId);
		if (before === 0 && set.size === 1) {
			await this.subClient.subscribe(stock, (message) => {
				this.handleMessage(stock, message);
			});
			console.log(`Subscribed to ${stock}`);
		}
	}

	public async userUnSubscribe(userId: string, stock: string) {
		const set = this.subscriptions.get(stock);
		if (!set) return;
		set.delete(userId);
		if (set.size === 0) {
			this.subscriptions.delete(stock);
			await this.subClient.unsubscribe(stock);
			console.log(`Unsubscribed from ${stock}`);
		}
	}

	private handleMessage(stock: string, message: string) {
		const set = this.subscriptions.get(stock);
		if (!set) return;
		for (const userId of set) {
			// TODO: deliver to userId, e.g., wsMap.get(userId)?.send(message);
			console.log(`Deliver ${stock} -> ${userId}: ${message}`);
		}
	}

	public async disconnect() {
		await this.subClient.quit();
	}
}
