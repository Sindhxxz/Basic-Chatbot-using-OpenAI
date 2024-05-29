from flask import Flask, request, Response, jsonify
from openai import OpenAI
from flask_cors import CORS, cross_origin
import uuid
import logging

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
# Initialize OpenAI client
openai_client = OpenAI(api_key='Place your OPEN AI API KEY')

logging.basicConfig(level=logging.DEBUG)

sessions={}

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message')
    logging.debug(f"Received user message: {user_message}")

    session_id=str(uuid.uuid4())
    logging.debug(f"Generated session ID: {session_id}")

    # Generate chatbot completion using GPT-3.5 Turbo model
    completion_stream = openai_client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages= [{"role": "system", "content": "You are a helpful assistant."}, {"role": "user", "content": user_message}],
        stream=True
    )

    sessions[session_id]=completion_stream
    logging.debug(f"Stored completion stream for session ID: {session_id}")

    return jsonify({'session_id':session_id})

@app.route('/api/chat/stream/<session_id>', methods=['GET'])
def stream_chat(session_id):
    logging.debug(f"Stream request received for session ID: {session_id}")
    completion_stream = sessions.get(session_id)
    
    if completion_stream is None:
        logging.error(f"Session ID {session_id} not found")
        return Response("Session not found", status=404)

    def stream_response():
        try:
            for chunk in completion_stream:
                print("Printing Chunk: ", chunk)
                if hasattr(chunk, 'choices') and chunk.choices[0].delta is not None:
                    content = chunk.choices[0].delta.content
                    if content is not None:
                        logging.debug(f"Streaming content: {content}")
                        yield f"data: {content}\n\n"
                    #else:
                     #   logging.debug(f"Skipping chunk: {chunk}")
            # Send a final message indicating the end of the stream
            yield "data: [DONE]\n\n"
        finally:
            del sessions[session_id]
            logging.debug(f"Deleted session ID: {session_id}")

    return Response(stream_response(), content_type='text/event-stream')

if __name__ == '__main__':
    app.run(debug=True)
