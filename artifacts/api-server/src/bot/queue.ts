export interface Song {
  title: string;
  url: string;
  duration: string;
  requestedBy: string;
  thumbnail?: string;
}

export class MusicQueue {
  private songs: Song[] = [];

  add(song: Song) {
    this.songs.push(song);
  }

  shift(): Song | undefined {
    return this.songs.shift();
  }

  peek(): Song | undefined {
    return this.songs[0];
  }

  getAll(): Song[] {
    return [...this.songs];
  }

  clear() {
    this.songs = [];
  }

  get size(): number {
    return this.songs.length;
  }
}
