attribute vec4 vPosition;
uniform vec4 offset;

void main() {
	gl_Position = vPosition + offset;
}