#ifdef GL_FRAGMENT_SHADER_PRECISION_HIGH
	precision highp float;
#else
	precision mediump float;
#endif
uniform vec4 color;

void
main()
{
    gl_FragColor = color;
}