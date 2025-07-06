
import PostForm from './PostForm';
import Feed from './Feed';

function Home() {
  return (
    <div className="max-w-4xl mx-auto mt-10">
      <PostForm />
      <Feed username={null} /> {/* Null username to fetch all posts */}
    </div>
  );
}

export default Home;
