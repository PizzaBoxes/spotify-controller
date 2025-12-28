interface UserProfile {
    country: string;
    display_name: string;
    email: string;
    explicit_content: {
        filter_enabled: boolean,
        filter_locked: boolean
    },
    external_urls: { spotify: string; };
    followers: { href: string; total: number; };
    href: string;
    id: string;
    images: Image[];
    product: string;
    type: string;
    uri: string;
}

interface UserPlayback {
    device: object;
    repeat_state: string;
    shuffle_state: boolean;
    context: object;
    timestamp: integer;
    progress_ms: integer;
    is_playing: boolean;
    item: oneOf;
    currently_playing_type: string;
    actions: object;
}

interface Image {
    url: string;
    height: number;
    width: number;
}
