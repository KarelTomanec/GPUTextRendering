#version 330 core
in vec2 texCoord;

out vec4 fragmentColor;

uniform sampler2DRect curveTexture;
uniform usampler2DRect bandTexture;

uniform vec4 textColor;
uniform vec4 bandParameters;

const float epsilon = 0.001;

uniform int bandCount;

// calculates root code to see if the curve makes contribution
uint calcRootCode(float y0, float y1, float y2);

// solve values of t for polynomial  at^2 - 2bt + c where curve crosses x axis
vec2 solvePolyHorizontal(vec4 b01, vec2 b2);

// solve values of t for polynomial  at^2 - 2bt + c where curve crosses y axis
vec2 solvePolyVertical(vec4 b01, vec2 b2);

void main()
{   
	// init coverages
	float hCoverage = 0.0f;
	float vCoverage = 0.0f;
	// get size correct size of pixel from shaders derivatives
	vec2 pixelsInEm = vec2(1.0 / fwidth(texCoord.x), 1.0 / fwidth(texCoord.y));
	// fetch data from band texture for horizontal rays
	uint bandIndexHorizontal = uint((texCoord.y + bandParameters.x) * bandParameters.z);
	uint bandCurveCount = uint(texelFetch(bandTexture, ivec2(bandIndexHorizontal, 0)).x);
	uint bandDataOffset = uint(texelFetch(bandTexture, ivec2(bandIndexHorizontal, 0)).y);
	float bandSplitValue = float((texelFetch(bandTexture, ivec2(bandIndexHorizontal, 0)).z << 16U) + texelFetch(bandTexture, ivec2(bandIndexHorizontal, 0)).w);
	// horizontal rays
	if(texCoord.x > bandSplitValue) {
		// right direction
		for(uint j = bandDataOffset; j < bandCurveCount + bandDataOffset; j++) {
			// calculate location of the current curve
			uint curveLocation = (texelFetch(bandTexture, ivec2(j, 0)).x << 16U) + texelFetch(bandTexture, ivec2(j, 0)).y;
			// fetch 2D control points for the current curve
			vec4 b01 = texelFetch(curveTexture, ivec2(curveLocation, 0)) - vec4(texCoord, texCoord);
			vec2 b2 = texelFetch(curveTexture, ivec2((curveLocation + 1U), 0)).xy - texCoord;
			// check if all three control points falls left of the current pixel
			if(max(max(b01.x, b01.z), b2.x) * pixelsInEm.x < -0.5) break;
			// get root code to see if curve makes contribution
			uint code = calcRootCode(b01.y, b01.w, b2.y);
			if(code != 0U) {
				// at least one root makes a contribution in winding number
				vec2 x = solvePolyHorizontal(b01, b2);
				// transform results to [0,1]
				x.x = clamp(x.x * pixelsInEm.x + 0.5, 0.0, 1.0);
				x.y = clamp(x.y * pixelsInEm.x + 0.5, 0.0, 1.0);
				// update winding number
				if ((code & 1U) != 0U) {
					hCoverage += x.x;
				}
				if (code > 1U) {
					hCoverage -= x.y;
				}
			}
		}
	} else {
		// left direction
		for(uint j = bandDataOffset; j < bandCurveCount + bandDataOffset; j++) {
			// calculate location of the current curve
			uint curveLocation = (texelFetch(bandTexture, ivec2(j, 0)).z << 16U) + texelFetch(bandTexture, ivec2(j, 0)).w;
			// fetch 2D control points for the current curve
			vec4 b01 = texelFetch(curveTexture, ivec2(curveLocation, 0)) - vec4(texCoord, texCoord);
			vec2 b2 = texelFetch(curveTexture, ivec2((curveLocation + 1U), 0)).xy - texCoord;
			// check if all three control points falls right of the current pixel
			if(min(min(b01.x, b01.z), b2.x) * pixelsInEm.x > 0.5) break;
			// get root code to see if curve makes contribution
			uint code = calcRootCode(b01.y, b01.w, b2.y);
			if(code != 0U) {
				// at least one root makes a contribution in winding number
				vec2 x = solvePolyHorizontal(b01, b2);
				// transform results to [0,1]
				x.x = clamp(0.5 - x.x * pixelsInEm.x, 0.0, 1.0);
				x.y = clamp(0.5 - x.y * pixelsInEm.x, 0.0, 1.0);
				// update winding number
				if ((code & 1U) != 0U) {
					hCoverage += x.x;
				}
				if (code > 1U) {
					hCoverage -= x.y;
				}
			}
		}
	}
	
	// fetch data from band texture for vertical rays
	uint bandIndexVertical = uint((texCoord.x + bandParameters.y) * bandParameters.w + bandCount);
	bandCurveCount = uint(texelFetch(bandTexture, ivec2(bandIndexVertical, 0)).x);
	bandDataOffset = uint(texelFetch(bandTexture, ivec2(bandIndexVertical, 0)).y);
	bandSplitValue = float((texelFetch(bandTexture, ivec2(bandIndexVertical, 0)).z << 16U) + texelFetch(bandTexture, ivec2(bandIndexVertical, 0)).w);
	// vertical rays
	if(texCoord.y > bandSplitValue) {
		// up direction
		for(uint j = bandDataOffset; j < bandCurveCount + bandDataOffset; j++) {
			// calculate location of the current curve
			uint curveLocation = (texelFetch(bandTexture, ivec2(j, 0)).x << 16U) + texelFetch(bandTexture, ivec2(j, 0)).y;
			// fetch 2D control points for the current curve
			vec4 b01 = texelFetch(curveTexture, ivec2(curveLocation, 0)) - vec4(texCoord, texCoord);
			vec2 b2 = texelFetch(curveTexture, ivec2((curveLocation + 1U), 0)).xy - texCoord;
			// check if all three control points falls down of the current pixel
			if(max(max(b01.y, b01.w), b2.y) * pixelsInEm.y < -0.5) break;
			// get root code to see if curve makes contribution
			uint code = calcRootCode(b01.x, b01.z, b2.x);
			if (code != 0U)
			{
				// at least one root makes a contribution in winding number
				vec2 y = solvePolyVertical(b01, b2);
				// transform results to [0,1]
				y.x = clamp(y.x * pixelsInEm.y + 0.5, 0.0, 1.0);
				y.y = clamp(y.y * pixelsInEm.y + 0.5, 0.0, 1.0);
				// update winding number
				if ((code & 1U) != 0U)  {
					vCoverage += y.x;
				}
				if (code > 1U) {
					vCoverage -= y.y;
				}
			}
		}
	} else {
		// down direction
		for(uint j = bandDataOffset; j < bandCurveCount + bandDataOffset; j++) {
			// calculate location of the current curve
			uint curveLocation = (texelFetch(bandTexture, ivec2(j, 0)).z << 16U) + texelFetch(bandTexture, ivec2(j, 0)).w;
			// fetch 2D control points for the current curve
			vec4 b01 = texelFetch(curveTexture, ivec2(curveLocation, 0)) - vec4(texCoord, texCoord);
			vec2 b2 = texelFetch(curveTexture, ivec2((curveLocation + 1U), 0)).xy - texCoord;
			// check if all three control points falls up of the current pixel
			if(min(min(b01.y, b01.w), b2.y) * pixelsInEm.y > 0.5) break;
			// get root code to see if curve makes contribution
			uint code = calcRootCode(b01.x, b01.z, b2.x);
			if (code != 0U)
			{
				// at least one root makes a contribution in winding number
				vec2 y = solvePolyVertical(b01, b2);
				// transform results to [0,1]
				y.x = clamp(0.5 - y.x * pixelsInEm.y, 0.0, 1.0);
				y.y = clamp(0.5 - y.y * pixelsInEm.y, 0.0, 1.0);
				// update winding number
				if ((code & 1U) != 0U)  {
					vCoverage += y.x;
				}
				if (code > 1U) {
					vCoverage -= y.y;
				}
			}
		}
	}
	// make average of hCoverage and vCoverage and clamp result to [0,1]
	float coverage = clamp((abs(hCoverage) + abs(vCoverage)) * 0.5, 0.0, 1.0);
	// mapping to opacity
	float alpha = sqrt(coverage) * textColor.w;
	fragmentColor = vec4(textColor.xyz, alpha);
} 


uint calcRootCode(float y0, float y1, float y2) {
	return (0x2E74U >> (((y0 > 0.0) ? 2U : 0U) + ((y1 > 0.0) ? 4U : 0U) + ((y2 > 0.0) ? 8U : 0U))) & 3U;}

vec2 solvePolyHorizontal(vec4 b01, vec2 b2) {
	// solve values of t for polynomial  at^2 - 2bt + c where curve crosses x axis
	float ax = b01.x - b01.z * 2.0 + b2.x;
	float ay = b01.y - b01.w * 2.0 + b2.y;
	float bx = b01.x - b01.z;
	float by = b01.y - b01.w;
	float da = 1.0 / ay;
	float d = sqrt(max(0.0, by * by - ay * b01.y));
	float t1 = da * (by - d);
	float t2 = da * (by + d);
	if (abs(ay) < epsilon) {
		// polynomial is nearly linear solve -2bt + c
		t1 = b01.y * 0.5 / by;
		t2 = b01.y * 0.5 / by;
	}
	return vec2((ax * t1 - bx * 2.0) * t1 + b01.x, (ax * t2 - bx * 2.0) * t2 + b01.x);
}

vec2 solvePolyVertical(vec4 b01, vec2 b2) {
	// solve values of t for polynomial at^2 - 2bt + c where curve crosses y axis
	float ax = b01.y - b01.w * 2.0 + b2.y;
	float ay = b01.x - b01.z * 2.0 + b2.x;
	float bx = b01.y - b01.w;
	float by = b01.x - b01.z;
	float ra = 1.0 / ay;
	float d = sqrt(max(by * by - ay * b01.x, 0.0));
	float t1 = (by - d) * ra;
	float t2 = (by + d) * ra;
	if (abs(ay) < epsilon) {
		// polynomial is nearly linear solve -2bt + c
		t1 = t2 = b01.x * 0.5 / by;
	}
	return vec2((ax * t1 - bx * 2.0) * t1 + b01.y, (ax * t2 - bx * 2.0) * t2 + b01.y);
}
